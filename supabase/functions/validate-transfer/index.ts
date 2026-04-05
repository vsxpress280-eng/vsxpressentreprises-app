import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { transfer_id, worker_id, action, proof_url } = await req.json()

    if (!transfer_id || !worker_id) {
      throw new Error('Missing required fields')
    }

    const { data: transfer, error: transferError } = await supabase
      .from('transfers')
      .select('*')
      .eq('id', transfer_id)
      .single()

    if (transferError || !transfer) {
      throw new Error('Transfer not found')
    }

    // Allow rejecting previously rejected transfers (idempotency) but generally we expect pending
    if (transfer.status !== 'pending' && !(action === 'reject' && transfer.status === 'rejected')) {
      return new Response(
        JSON.stringify({ error: 'Transfer is not pending', status: 409 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 409 }
      )
    }

    if (action === 'reject') {
      try {
        // Idempotency check: if already rejected, return success without refunding again
        if (transfer.status === 'rejected') {
             return new Response(
              JSON.stringify({ 
                success: true, 
                message: 'Transfer already rejected', 
                refunded: false 
              }),
              { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
            )
        }

        const agent_id = transfer.agent_id
        
        // 1. Rate Resolution Logic
        let rate = Number(transfer.exchange_rate_snapshot)
        let rateSource = 'snapshot'

        if (!rate || rate <= 0) {
          // Fetch agent's current exchange_rate if snapshot is missing/invalid
          const { data: agent, error: agentError } = await supabase
            .from('users')
            .select('exchange_rate')
            .eq('id', agent_id)
            .single()
            
          if (agentError || !agent || !agent.exchange_rate) {
             throw new Error("Cannot reject transfer: exchange rate unavailable. Please contact support.")
          }
          
          rate = Number(agent.exchange_rate)
          rateSource = 'current'
        }

        // Final safety check on rate
        if (!rate || rate <= 0) {
             throw new Error("Cannot reject transfer: exchange rate unavailable (invalid value). Please contact support.")
        }
        
        // 2. Refund Calculation
        const amountDOP = Number(transfer.amount_dop || 0)
        const refundAmount = amountDOP * rate
        
        if (agent_id && refundAmount > 0) {
          const { data: wallet, error: walletFetchError } = await supabase
            .from('wallets')
            .select('balance_htg')
            .eq('user_id', agent_id)
            .single()

          if (walletFetchError && walletFetchError.code !== 'PGRST116') {
            throw new Error(`Failed to fetch agent wallet: ${walletFetchError.message}`)
          }

          const currentBalance = wallet?.balance_htg || 0
          const newBalance = currentBalance + refundAmount

          const { error: walletUpdateError } = await supabase
            .from('wallets')
            .upsert({
              user_id: agent_id,
              balance_htg: newBalance,
              updated_at: new Date().toISOString()
            })

          if (walletUpdateError) {
            throw new Error(`Failed to update agent wallet: ${walletUpdateError.message}`)
          }

          const { error: txError } = await supabase.from('wallet_transactions').insert({
            user_id: agent_id,
            type: 'transfer_rejection_refund',
            amount_htg: refundAmount,
            reference_id: transfer_id,
            description: `Remboursement transfert rejeté #${transfer_id}`,
            created_at: new Date().toISOString()
          })

          if (txError) {
            throw new Error(`Failed to create transaction record: ${txError.message}`)
          }
        }

        // 3. Update Transfer
        const { error: updateError } = await supabase
          .from('transfers')
          .update({ 
            status: 'rejected',
            rejected_at: new Date().toISOString()
          })
          .eq('id', transfer_id)

        if (updateError) {
          throw new Error(`Failed to update transfer status: ${updateError.message}`)
        }

        return new Response(
          JSON.stringify({ 
            success: true, 
            refunded: true, 
            refund_amount: refundAmount, 
            rate_source: rateSource,
            message: 'Transfer rejected and agent refunded' 
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
        )

      } catch (innerError) {
        throw innerError
      }
    }

    if (action === 'validate') {
      const amount = Number(transfer.total_htg || transfer.amount || 0)
      
      if (amount <= 0) {
        throw new Error('Invalid transfer amount')
      }

      const delta = -amount

      const { data: wallet } = await supabase
        .from('wallets')
        .select('balance_htg')
        .eq('user_id', worker_id)
        .single()

      const currentBalance = wallet?.balance_htg || 0
      const newBalance = currentBalance + delta

      const { error: walletError } = await supabase
        .from('wallets')
        .upsert({
          user_id: worker_id,
          balance_htg: newBalance,
          updated_at: new Date().toISOString()
        })

      if (walletError) throw walletError

      await supabase.from('wallet_transactions').insert({
        user_id: worker_id,
        type: 'transfer_validation',
        amount_htg: delta,
        reference_id: transfer_id,
        description: `Validation transfer #${transfer_id}`,
        created_at: new Date().toISOString()
      })

      const { error: updateError } = await supabase
        .from('transfers')
        .update({
          status: 'validated',
          proof_url: proof_url || null,
          validated_at: new Date().toISOString()
        })
        .eq('id', transfer_id)

      if (updateError) throw updateError

      return new Response(
        JSON.stringify({ success: true, new_balance: newBalance }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      )
    }

    throw new Error('Invalid action')

  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    )
  }
})