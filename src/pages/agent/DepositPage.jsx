import React, { useState } from 'react';
import { Helmet } from 'react-helmet';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { ArrowLeft, DollarSign } from 'lucide-react';

const DepositPage = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [amount, setAmount] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    setTimeout(() => {
      setIsLoading(false);
      toast({
        title: 'Deposit Submitted',
        description: 'Your deposit is pending admin validation',
      });
      setAmount('');
    }, 1500);
  };

  return (
    <>
      <Helmet>
        <title>Make Deposit - Agent - VS XPRESS ENTREPRISE</title>
        <meta name="description" content="Submit a deposit for validation" />
      </Helmet>

      <div className="min-h-screen bg-[#0B0B0B] p-6">
        <div className="max-w-3xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <Button
              onClick={() => navigate('/agent/dashboard')}
              variant="ghost"
              className="text-[#A0A0A0] hover:text-[#D4AF37] mb-4"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Dashboard
            </Button>
            <h1 className="text-3xl font-bold text-[#FFFFFF]">Make Deposit</h1>
            <p className="text-[#A0A0A0] mt-2">Submit your deposit for admin validation</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="bg-[#1E1E1E] rounded-2xl p-8 border border-[#2A2A2A]"
          >
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="amount" className="text-[#A0A0A0]">Deposit Amount (USD)</Label>
                <Input
                  id="amount"
                  type="number"
                  placeholder="1000.00"
                  step="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  required
                  className="bg-[#0B0B0B] border-[#2A2A2A] text-[#FFFFFF] focus:border-[#D4AF37] text-2xl py-6"
                />
              </div>

              <div className="bg-[#0B0B0B] border border-[#2A2A2A] rounded-xl p-6">
                <h3 className="text-[#D4AF37] font-semibold mb-4">Important Information</h3>
                <ul className="space-y-2 text-[#A0A0A0] text-sm">
                  <li>• Deposits must be validated by an administrator before being credited</li>
                  <li>• Please ensure you have the physical cash ready before submitting</li>
                  <li>• You will be notified once your deposit is approved</li>
                  <li>• Keep your deposit receipt for verification</li>
                </ul>
              </div>

              <Button
                type="submit"
                disabled={isLoading}
                className="w-full bg-[#D4AF37] hover:bg-[#B8941F] text-[#0B0B0B] font-semibold py-6 rounded-xl gold-glow-btn"
              >
                <DollarSign className="w-5 h-5 mr-2" />
                {isLoading ? 'Submitting Deposit...' : 'Submit Deposit'}
              </Button>
            </form>
          </motion.div>
        </div>
      </div>
    </>
  );
};

export default DepositPage;