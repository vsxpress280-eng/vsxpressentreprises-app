import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { AdjustmentApi } from '@/api/AdjustmentApi';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useToast } from '@/components/ui/use-toast';
import { Loader2, Upload, Search, Filter } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

const AdjustmentPage = () => {
  const { t } = useTranslation();
  const { toast } = useToast();
  
  // Form State
  const [users, setUsers] = useState([]);
  const [targetUser, setTargetUser] = useState('');
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState('HTG');
  const [direction, setDirection] = useState('credit');
  const [reason, setReason] = useState('');
  const [file, setFile] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // List State
  const [adjustments, setAdjustments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState(0);
  const [statusFilter, setStatusFilter] = useState('all');
  const limit = 10;

  useEffect(() => {
    fetchUsers();
    fetchAdjustments();
  }, [page, statusFilter]);

  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('id, nom, prenom, email, role')
        .in('role', ['agent', 'worker', 'special-agent'])
        .order('nom');
      
      if (error) throw error;
      setUsers(data || []);
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const fetchAdjustments = async () => {
    setLoading(true);
    const { data, count, error } = await AdjustmentApi.getAdjustments(limit, page * limit, statusFilter);
    if (error) {
      toast({
        variant: 'destructive',
        title: 'Erreur',
        description: 'Impossible de charger l\'historique',
      });
    } else {
      setAdjustments(data);
      setTotal(count);
    }
    setLoading(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!targetUser || !amount || !reason) {
      toast({ variant: 'destructive', title: 'Erreur', description: 'Veuillez remplir tous les champs obligatoires' });
      return;
    }

    setIsSubmitting(true);
    const { error } = await AdjustmentApi.createAdjustment({
      targetUserId: targetUser,
      amount: parseFloat(amount),
      currency,
      direction,
      reason,
      proofFile: file
    });

    setIsSubmitting(false);

    if (error) {
      toast({
        variant: 'destructive',
        title: 'Erreur',
        description: 'Échec de la création de l\'ajustement',
      });
    } else {
      toast({
        title: 'Succès',
        description: 'Ajustement créé et envoyé pour approbation',
        className: 'bg-green-600 text-white border-none'
      });
      // Reset form
      setTargetUser('');
      setAmount('');
      setReason('');
      setFile(null);
      // Refresh list
      fetchAdjustments();
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return 'bg-yellow-500/20 text-yellow-500';
      case 'approved': return 'bg-blue-500/20 text-blue-500';
      case 'applied': return 'bg-green-500/20 text-green-500';
      case 'rejected': return 'bg-red-500/20 text-red-500';
      default: return 'bg-gray-500/20 text-gray-500';
    }
  };

  const filteredUsers = users.filter(u => 
    `${u.nom} ${u.prenom} ${u.email}`.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-8 space-y-8">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-white">Gestion des Ajustements</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Create Form */}
        <Card className="bg-[#1A1A1A] border-[#333] lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-[#D4AF37]">Nouvel Ajustement</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label>Utilisateur Cible</Label>
                <div className="relative">
                  <Input 
                    placeholder="Rechercher un utilisateur..." 
                    className="mb-2 bg-[#0B0B0B] border-[#333] text-white"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                  <Select value={targetUser} onValueChange={setTargetUser}>
                    <SelectTrigger className="bg-[#0B0B0B] border-[#333] text-white">
                      <SelectValue placeholder="Sélectionner un utilisateur" />
                    </SelectTrigger>
                    <SelectContent className="bg-[#1A1A1A] border-[#333] text-white max-h-[200px]">
                      {filteredUsers.map(user => (
                        <SelectItem key={user.id} value={user.id}>
                          {user.prenom} {user.nom} ({user.role})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Montant</Label>
                  <Input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="bg-[#0B0B0B] border-[#333] text-white"
                    min="0"
                    step="0.01"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Devise</Label>
                  <Select value={currency} onValueChange={setCurrency}>
                    <SelectTrigger className="bg-[#0B0B0B] border-[#333] text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-[#1A1A1A] border-[#333] text-white">
                      <SelectItem value="HTG">HTG</SelectItem>
                      <SelectItem value="DOP">DOP</SelectItem>
                      <SelectItem value="USDT">USDT</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Direction</Label>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant={direction === 'credit' ? 'default' : 'outline'}
                    className={`flex-1 ${direction === 'credit' ? 'bg-green-600 hover:bg-green-700' : 'border-[#333] text-gray-400'}`}
                    onClick={() => setDirection('credit')}
                  >
                    Crédit (+)
                  </Button>
                  <Button
                    type="button"
                    variant={direction === 'debit' ? 'default' : 'outline'}
                    className={`flex-1 ${direction === 'debit' ? 'bg-red-600 hover:bg-red-700' : 'border-[#333] text-gray-400'}`}
                    onClick={() => setDirection('debit')}
                  >
                    Débit (-)
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Raison</Label>
                <Textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="bg-[#0B0B0B] border-[#333] text-white"
                  rows={3}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label>Preuve (Optionnel)</Label>
                <div className="flex items-center gap-2">
                  <Input
                    type="file"
                    onChange={(e) => setFile(e.target.files[0])}
                    className="bg-[#0B0B0B] border-[#333] text-white cursor-pointer"
                    accept="image/*"
                  />
                </div>
              </div>

              <Button 
                type="submit" 
                className="w-full bg-[#D4AF37] hover:bg-[#B5952F] text-black font-bold"
                disabled={isSubmitting}
              >
                {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Créer l'ajustement
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* List */}
        <Card className="bg-[#1A1A1A] border-[#333] lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-white">Historique</CardTitle>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px] bg-[#0B0B0B] border-[#333] text-white">
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue placeholder="Statut" />
              </SelectTrigger>
              <SelectContent className="bg-[#1A1A1A] border-[#333] text-white">
                <SelectItem value="all">Tous</SelectItem>
                <SelectItem value="pending">En attente</SelectItem>
                <SelectItem value="applied">Appliqué</SelectItem>
                <SelectItem value="rejected">Rejeté</SelectItem>
              </SelectContent>
            </Select>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border border-[#333]">
              <Table>
                <TableHeader className="bg-[#0B0B0B]">
                  <TableRow className="border-[#333] hover:bg-transparent">
                    <TableHead className="text-gray-400">Date</TableHead>
                    <TableHead className="text-gray-400">Utilisateur</TableHead>
                    <TableHead className="text-gray-400">Montant</TableHead>
                    <TableHead className="text-gray-400">Raison</TableHead>
                    <TableHead className="text-gray-400">Statut</TableHead>
                    <TableHead className="text-gray-400">Preuve</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8">
                        <Loader2 className="w-8 h-8 animate-spin mx-auto text-[#D4AF37]" />
                      </TableCell>
                    </TableRow>
                  ) : adjustments.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                        Aucun ajustement trouvé
                      </TableCell>
                    </TableRow>
                  ) : (
                    adjustments.map((adj) => (
                      <TableRow key={adj.id} className="border-[#333] hover:bg-[#0B0B0B]/50">
                        <TableCell className="text-gray-300">
                          {new Date(adj.created_at).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="text-gray-300">
                          <div className="flex flex-col">
                            <span className="font-medium text-white">
                              {adj.target_user?.prenom} {adj.target_user?.nom}
                            </span>
                            <span className="text-xs text-gray-500">{adj.target_user?.email}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className={`font-bold ${adj.direction === 'credit' ? 'text-green-500' : 'text-red-500'}`}>
                            {adj.direction === 'credit' ? '+' : '-'}
                            {parseFloat(adj.amount).toLocaleString()} {adj.currency}
                          </span>
                        </TableCell>
                        <TableCell className="text-gray-300 max-w-[200px] truncate" title={adj.reason}>
                          {adj.reason}
                        </TableCell>
                        <TableCell>
                          <Badge className={getStatusColor(adj.status)}>
                            {adj.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {adj.proof_url ? (
                            <a href={adj.proof_url} target="_blank" rel="noopener noreferrer" className="text-[#D4AF37] hover:underline text-sm flex items-center gap-1">
                              <Upload size={14} /> Voir
                            </a>
                          ) : (
                            <span className="text-gray-600 text-xs">-</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
            
            {/* Pagination */}
            <div className="flex items-center justify-end space-x-2 py-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(p => Math.max(0, p - 1))}
                disabled={page === 0}
                className="border-[#333] text-gray-300 hover:bg-[#333]"
              >
                Précédent
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(p => p + 1)}
                disabled={(page + 1) * limit >= total}
                className="border-[#333] text-gray-300 hover:bg-[#333]"
              >
                Suivant
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdjustmentPage;