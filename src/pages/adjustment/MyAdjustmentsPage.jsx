import React, { useState, useEffect } from 'react';
import { AdjustmentApi } from '@/api/AdjustmentApi';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { Loader2, Check, X, FileText, ArrowUpRight, ArrowDownLeft } from 'lucide-react';
import { format } from 'date-fns';

const MyAdjustmentsPage = () => {
  const { toast } = useToast();
  const [adjustments, setAdjustments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState(0);
  const limit = 20;

  useEffect(() => {
    fetchAdjustments();
  }, [page]);

  const fetchAdjustments = async () => {
    setLoading(true);
    const { data, count, error } = await AdjustmentApi.getUserAdjustments(limit, page * limit);
    if (error) {
      toast({
        variant: 'destructive',
        title: 'Erreur',
        description: 'Impossible de charger vos ajustements',
      });
    } else {
      setAdjustments(data);
      setTotal(count);
    }
    setLoading(false);
  };

  const handleAccept = async (id) => {
    setActionLoading(id);
    const { data, error } = await AdjustmentApi.applyAdjustment(id);
    setActionLoading(null);

    if (error || !data?.success) {
      toast({
        variant: 'destructive',
        title: 'Erreur',
        description: error?.message || data?.message || 'Une erreur est survenue',
      });
    } else {
      toast({
        title: 'Succès',
        description: 'Ajustement accepté et appliqué à votre balance',
        className: 'bg-green-600 text-white border-none'
      });
      fetchAdjustments();
    }
  };

  const handleReject = async (id) => {
    setActionLoading(id);
    const { data, error } = await AdjustmentApi.rejectAdjustment(id);
    setActionLoading(null);

    if (error || !data?.success) {
      toast({
        variant: 'destructive',
        title: 'Erreur',
        description: error?.message || data?.message || 'Une erreur est survenue',
      });
    } else {
      toast({
        title: 'Rejeté',
        description: 'Vous avez rejeté cet ajustement',
      });
      fetchAdjustments();
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'pending':
        return <Badge className="bg-yellow-500/20 text-yellow-500 hover:bg-yellow-500/30">En attente</Badge>;
      case 'approved': // Rarely used in this flow
        return <Badge className="bg-blue-500/20 text-blue-500 hover:bg-blue-500/30">Approuvé</Badge>;
      case 'applied':
        return <Badge className="bg-green-500/20 text-green-500 hover:bg-green-500/30">Appliqué</Badge>;
      case 'rejected':
        return <Badge className="bg-red-500/20 text-red-500 hover:bg-red-500/30">Rejeté</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-8 space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white mb-2">Mes Ajustements</h1>
        <p className="text-gray-400">Gérez les demandes d'ajustement de solde proposées par l'administration.</p>
      </div>

      <div className="space-y-4">
        {loading && adjustments.length === 0 ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-[#D4AF37]" />
          </div>
        ) : adjustments.length === 0 ? (
          <Card className="bg-[#1A1A1A] border-[#333]">
            <CardContent className="flex flex-col items-center justify-center py-12 text-gray-500">
              <FileText className="w-12 h-12 mb-4 opacity-20" />
              <p>Aucun ajustement trouvé</p>
            </CardContent>
          </Card>
        ) : (
          adjustments.map((adj) => (
            <Card key={adj.id} className="bg-[#1A1A1A] border-[#333] overflow-hidden">
              <div className="flex flex-col md:flex-row">
                {/* Status Color Strip */}
                <div className={`w-full md:w-2 h-2 md:h-auto ${
                  adj.status === 'pending' ? 'bg-yellow-500' :
                  adj.status === 'applied' ? 'bg-green-500' :
                  adj.status === 'rejected' ? 'bg-red-500' : 'bg-gray-500'
                }`} />
                
                <CardContent className="flex-1 p-6">
                  <div className="flex flex-col md:flex-row justify-between items-start gap-4">
                    <div className="space-y-2 flex-1">
                      <div className="flex items-center gap-3">
                        <span className="text-sm text-gray-400 font-mono">
                          {format(new Date(adj.created_at), 'dd MMM yyyy, HH:mm')}
                        </span>
                        {getStatusBadge(adj.status)}
                      </div>
                      
                      <div className="flex items-center gap-2">
                        {adj.direction === 'credit' ? (
                          <ArrowDownLeft className="text-green-500 w-5 h-5" />
                        ) : (
                          <ArrowUpRight className="text-red-500 w-5 h-5" />
                        )}
                        <h3 className="text-xl font-bold text-white">
                          {adj.direction === 'credit' ? '+' : '-'}
                          {parseFloat(adj.amount).toLocaleString()} <span className="text-sm text-gray-400">{adj.currency}</span>
                        </h3>
                      </div>
                      
                      <p className="text-gray-300 bg-black/20 p-3 rounded-md border border-white/5 text-sm">
                        {adj.reason}
                      </p>

                      {adj.proof_url && (
                        <div className="mt-2">
                           <a 
                             href={adj.proof_url} 
                             target="_blank" 
                             rel="noopener noreferrer"
                             className="text-[#D4AF37] hover:underline text-sm inline-flex items-center gap-1"
                           >
                             <FileText size={14} /> Voir le document joint
                           </a>
                        </div>
                      )}
                    </div>

                    {/* Actions for Pending */}
                    {adj.status === 'pending' && (
                      <div className="flex flex-row md:flex-col gap-2 w-full md:w-auto mt-4 md:mt-0">
                        <Button
                          className="bg-green-600 hover:bg-green-700 text-white flex-1 md:flex-none"
                          onClick={() => handleAccept(adj.id)}
                          disabled={!!actionLoading}
                        >
                          {actionLoading === adj.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4 mr-2" />}
                          Accepter
                        </Button>
                        <Button
                          variant="outline"
                          className="border-red-500/50 text-red-500 hover:bg-red-500/10 flex-1 md:flex-none"
                          onClick={() => handleReject(adj.id)}
                          disabled={!!actionLoading}
                        >
                          <X className="w-4 h-4 mr-2" />
                          Refuser
                        </Button>
                      </div>
                    )}
                    
                    {/* Status Dates */}
                    {adj.status !== 'pending' && (
                      <div className="text-right text-xs text-gray-500 mt-2 md:mt-0">
                        <p>{adj.status === 'applied' ? 'Appliqué le' : 'Rejeté le'}:</p>
                        <p>{format(new Date(adj.updated_at), 'dd MMM yyyy')}</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </div>
            </Card>
          ))
        )}

        {/* Pagination */}
        <div className="flex items-center justify-center space-x-2 pt-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage(p => Math.max(0, p - 1))}
            disabled={page === 0}
            className="border-[#333] text-gray-300"
          >
            Précédent
          </Button>
          <span className="text-gray-500 text-sm">Page {page + 1}</span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage(p => p + 1)}
            disabled={(page + 1) * limit >= total}
            className="border-[#333] text-gray-300"
          >
            Suivant
          </Button>
        </div>
      </div>
    </div>
  );
};

export default MyAdjustmentsPage;