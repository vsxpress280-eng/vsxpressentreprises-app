import React, { useState } from 'react';
import { Helmet } from 'react-helmet';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { ArrowLeft, CheckCircle2, XCircle, ExternalLink } from 'lucide-react';

const ValidateTransfers = () => {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [transfers] = useState([
    { id: 1, sender: 'Juan Pérez', receiver: 'Pierre Duval', amount: '$500', agent: 'Carlos Rodriguez', date: '2025-12-18 09:30' },
    { id: 2, sender: 'Maria Garcia', receiver: 'Jean Baptiste', amount: '$750', agent: 'Maria Santos', date: '2025-12-18 10:15' },
    { id: 3, sender: 'Luis Martinez', receiver: 'Marie Claire', amount: '$1,200', agent: 'Jean Baptiste', date: '2025-12-18 11:00' },
  ]);

  const handleValidate = (transferId) => {
    navigate(`/worker/transfer/${transferId}`);
  };

  const handleReject = (transferId) => {
    navigate(`/worker/transfer/${transferId}`);
  };

  return (
    <>
      <Helmet>
        <title>Validate Transfers - Worker - VS XPRESS ENTREPRISE</title>
        <meta name="description" content="Validate pending money transfers" />
      </Helmet>

      <div className="min-h-screen bg-[#0B0B0B] p-6">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <Button
              onClick={() => navigate('/worker/dashboard')}
              variant="ghost"
              className="text-[#A0A0A0] hover:text-[#D4AF37] mb-4"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Dashboard
            </Button>
            <h1 className="text-3xl font-bold text-[#FFFFFF]">Validate Transfers</h1>
            <p className="text-[#A0A0A0] mt-2">Review and approve pending transfers</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="bg-[#1E1E1E] rounded-xl border border-[#2A2A2A] overflow-hidden"
          >
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-[#0B0B0B] border-b border-[#2A2A2A]">
                  <tr>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-[#A0A0A0]">Sender</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-[#A0A0A0]">Receiver</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-[#A0A0A0]">Amount</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-[#A0A0A0]">Agent</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-[#A0A0A0]">Date & Time</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-[#A0A0A0]">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {transfers.map((transfer, index) => (
                    <motion.tr
                      key={transfer.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className="border-b border-[#2A2A2A] hover:bg-[#0B0B0B] transition-colors"
                    >
                      <td className="px-6 py-4 text-[#FFFFFF]">{transfer.sender}</td>
                      <td className="px-6 py-4 text-[#FFFFFF]">{transfer.receiver}</td>
                      <td className="px-6 py-4 text-[#D4AF37] font-semibold">{transfer.amount}</td>
                      <td className="px-6 py-4 text-[#A0A0A0]">{transfer.agent}</td>
                      <td className="px-6 py-4 text-[#A0A0A0]">{transfer.date}</td>
                      <td className="px-6 py-4">
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            onClick={() => handleValidate(transfer.id)}
                            className="bg-[#10B981] hover:bg-[#059669] text-white rounded-lg"
                          >
                            <CheckCircle2 className="w-4 h-4 mr-1" />
                            Validate
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => handleReject(transfer.id)}
                            variant="outline"
                            className="border-red-500 text-red-500 hover:bg-red-500 hover:text-white rounded-lg"
                          >
                            <XCircle className="w-4 h-4 mr-1" />
                            Reject
                          </Button>
                        </div>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>
        </div>
      </div>
    </>
  );
};

export default ValidateTransfers;