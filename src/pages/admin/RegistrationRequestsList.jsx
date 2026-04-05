import React, { useMemo, useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Loader2,
  CheckCircle2,
  Clock,
  MessageCircle,
  Mail,
  MapPin,
  User,
  Eye,
  ArrowLeft,
  Copy,
  Check,
  Calendar,
  X,
  BadgeCheck,
  UserPlus,
  Ban,
} from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { useNavigate } from 'react-router-dom';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const RegistrationRequestsList = () => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState(null);

  // NEW: existing accounts map (by email / whatsapp)
  const [existingIndex, setExistingIndex] = useState({
    byEmail: new Set(),
    byWhatsapp: new Set(),
  });
  const [existingLoading, setExistingLoading] = useState(false);

  // Filters
  const [filterPreset, setFilterPreset] = useState('all'); // all | day | 7d | month | year | custom
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');

  // Modal
  const [selected, setSelected] = useState(null);
  const [detailsOpen, setDetailsOpen] = useState(false);

  // Copy feedback
  const [copiedKey, setCopiedKey] = useState(null); // 'whatsapp' | 'email'

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('registration_requests')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setRequests(data || []);
    } catch (error) {
      console.error('Error fetching requests:', error);
      toast({
        variant: 'destructive',
        title: t('common.error'),
        description: "Impossible de charger les demandes d'inscription.",
      });
    } finally {
      setLoading(false);
    }
  };

  // NEW: fetch existing accounts index (to prevent duplicate account creation)
  const fetchExistingAccountsIndex = async () => {
    setExistingLoading(true);
    try {
      // Assumption: accounts live in "agents" table with "email" and "whatsapp_number".
      // If your table is named differently, adjust the .from() + select columns.
      const { data, error } = await supabase
        .from('users')
.select('email, numero')

      if (error) throw error;

      const byEmail = new Set();
      const byWhatsapp = new Set();

      (data || []).forEach((row) => {
        const email = String(row?.email || '').trim().toLowerCase();
        if (email) byEmail.add(email);

        const wa = String(row?.whatsapp_number || '').replace(/\D/g, '');
        if (wa) byWhatsapp.add(wa);
      });

      setExistingIndex({ byEmail, byWhatsapp });
    } catch (e) {
      console.error('Error fetching existing accounts:', e);
      // We don’t hard-fail the page; only warn.
      toast({
        variant: 'destructive',
        title: t('common.error'),
        description:
          "Impossible de vérifier les comptes existants (table 'agents'). Ajuste le nom de la table si besoin.",
      });
      setExistingIndex({ byEmail: new Set(), byWhatsapp: new Set() });
    } finally {
      setExistingLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
    fetchExistingAccountsIndex();

    const channel = supabase
      .channel('admin-registration-requests-list')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'registration_requests' },
        () => fetchRequests()
      )
      .subscribe();

    // OPTIONAL: listen to accounts table changes too, so the lock updates in real time.
    const channel2 = supabase
      .channel('admin-registration-existing-accounts')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'agents' },
        () => fetchExistingAccountsIndex()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      supabase.removeChannel(channel2);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const getRangeFromPreset = () => {
    const now = new Date();

    const startOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0);
    const endOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59);

    if (filterPreset === 'all') return null;

    if (filterPreset === 'day') {
      return { from: startOfDay(now), to: endOfDay(now) };
    }

    if (filterPreset === '7d') {
      const from = new Date(now);
      from.setDate(from.getDate() - 6); // today included = 7 days
      return { from: startOfDay(from), to: endOfDay(now) };
    }

    if (filterPreset === 'month') {
      const from = new Date(now.getFullYear(), now.getMonth(), 1);
      const to = endOfDay(now);
      return { from: startOfDay(from), to };
    }

    if (filterPreset === 'year') {
      const from = new Date(now.getFullYear(), 0, 1);
      const to = endOfDay(now);
      return { from: startOfDay(from), to };
    }

    if (filterPreset === 'custom') {
      if (!customFrom && !customTo) return null;

      const from = customFrom ? new Date(customFrom + "T00:00:00") : null;
      const to = customTo ? new Date(customTo + "T23:59:59") : null;

      // Si un seul côté est fourni, on filtre à partir de/ jusqu’à
      return { from, to };
    }

    return null;
  };

  const normalizeEmail = (email) => String(email || '').trim().toLowerCase();
  const normalizeWhatsapp = (wa) => String(wa || '').replace(/\D/g, '');

  const hasExistingAccount = (req) => {
    const email = normalizeEmail(req?.email);
    const wa = normalizeWhatsapp(req?.whatsapp_number);

    const existsByEmail = email ? existingIndex.byEmail.has(email) : false;
    const existsByWhatsapp = wa ? existingIndex.byWhatsapp.has(wa) : false;

    return {
      blocked: existsByEmail || existsByWhatsapp,
      reason: existsByEmail
        ? "Compte déjà existant (email)"
        : existsByWhatsapp
          ? "Compte déjà existant (WhatsApp)"
          : null,
    };
  };

  const filteredRequests = useMemo(() => {
    const range = getRangeFromPreset();
    if (!range) return requests;

    return requests.filter((r) => {
      const d = new Date(r.created_at);
      const okFrom = range.from ? d >= range.from : true;
      const okTo = range.to ? d <= range.to : true;
      return okFrom && okTo;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requests, filterPreset, customFrom, customTo]);

  const openDetails = (req) => {
    setSelected(req);
    setDetailsOpen(true);
  };

  const markAsViewed = async (id, currentViewed) => {
    if (currentViewed) return;

    setProcessingId(id);
    try {
      const { error } = await supabase
        .from('registration_requests')
        .update({ viewed: true, updated_at: new Date() })
        .eq('id', id);

      if (error) throw error;

      toast({ title: t('common.success'), description: "Demande marquée comme vue." });

      setRequests(prev => prev.map(req =>
        req.id === id ? { ...req, viewed: true } : req
      ));

      // sync modal selection if open
      setSelected(prev => (prev?.id === id ? { ...prev, viewed: true } : prev));
    } catch (error) {
      console.error('Error updating request:', error);
      toast({
        variant: 'destructive',
        title: t('common.error'),
        description: "Une erreur est survenue.",
      });
    } finally {
      setProcessingId(null);
    }
  };

  const markAsCompleted = async (id, currentCompleted) => {
    if (currentCompleted) return;

    setProcessingId(id);
    try {
      const { error } = await supabase
        .from('registration_requests')
        .update({ completed: true, updated_at: new Date() })
        .eq('id', id);

      if (error) {
        // colonne manquante = cas fréquent si pas encore créée
        throw error;
      }

      toast({ title: t('common.success'), description: "Demande marquée comme terminée." });

      setRequests(prev => prev.map(req =>
        req.id === id ? { ...req, completed: true } : req
      ));
      setSelected(prev => (prev?.id === id ? { ...prev, completed: true } : prev));
    } catch (error) {
      console.error('Error marking completed:', error);
      toast({
        variant: 'destructive',
        title: "Impossible de terminer",
        description: "Ajoute une colonne boolean 'completed' dans registration_requests (Supabase), puis réessaie.",
      });
    } finally {
      setProcessingId(null);
    }
  };

  const handleWhatsAppClick = (number, name) => {
    const formattedNumber = String(number || '').replace(/\D/g, '');
    const message = `Bonjour ${name || ''}, suite à votre demande d'inscription sur VS XPRESS...`;
    window.open(`https://wa.me/${formattedNumber}?text=${encodeURIComponent(message)}`, '_blank');
  };

  const copyToClipboard = async (value, keyLabel) => {
    const text = String(value || '').trim();
    if (!text) return;

    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        // fallback
        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.style.position = 'fixed';
        textarea.style.left = '-9999px';
        document.body.appendChild(textarea);
        textarea.focus();
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }

      setCopiedKey(keyLabel);
      toast({ title: "Copié ✅", description: text });

      setTimeout(() => setCopiedKey(null), 1200);
    } catch (e) {
      toast({
        variant: 'destructive',
        title: "Copie impossible",
        description: "Votre navigateur a bloqué la copie.",
      });
    }
  };

  const statusBadge = (req) => {
    const completed = !!req.completed;
    const viewed = !!req.viewed;

    if (completed) {
      return (
        <div className="flex items-center gap-2 text-green-400 text-xs uppercase tracking-wider font-semibold">
          <BadgeCheck className="w-4 h-4" />
          <span>Terminé</span>
        </div>
      );
    }

    if (viewed) {
      return (
        <div className="flex items-center gap-2 text-emerald-500 text-xs uppercase tracking-wider font-semibold">
          <CheckCircle2 className="w-4 h-4" />
          <span>Vu</span>
        </div>
      );
    }

    return (
      <div className="flex items-center gap-2 text-[#D4AF37] text-xs uppercase tracking-wider font-semibold">
        <Clock className="w-4 h-4" />
        <span>Nouveau</span>
      </div>
    );
  };

  const goCreateAccountWithPrefill = (req) => {
    const lock = hasExistingAccount(req);
    if (lock.blocked) {
      toast({
        variant: 'destructive',
        title: "Création impossible",
        description: lock.reason || "Un compte existe déjà pour ce demandeur.",
      });
      return;
    }

    const prefill = {
      nom: req?.nom || '',
      prenom: req?.prenom || '',
      email: req?.email || '',
      whatsapp_number: req?.whatsapp_number || '',
      adresse: req?.adresse || '',
      request_id: req?.id || null,
    };

    navigate('/admin/create-account', { state: { prefill } });
  };

  const clearCustomDates = () => {
    setCustomFrom('');
    setCustomTo('');
  };

  return (
    <>
      <Helmet>
        <title>Demandes d'inscription - VS XPRESS</title>
      </Helmet>

      <div className="min-h-screen bg-[#0B0B0B] text-white p-4 sm:p-6 lg:p-8">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Header */}
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate('/admin/dashboard')}
              className="hover:bg-[#1E1E1E] text-[#A0A0A0]"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="flex-1">
              <h1 className="text-2xl font-bold">Demandes d'inscription</h1>
              <p className="text-[#A0A0A0]">Gérez les nouvelles demandes de création de compte.</p>
            </div>

            <Button
              variant="outline"
              className="border-[#2A2A2A] text-white hover:bg-white/10"
              onClick={fetchExistingAccountsIndex}
              disabled={existingLoading}
              title="Rafraîchir la vérification des comptes existants"
            >
              {existingLoading ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <RefreshIcon />
              )}
              Vérifier comptes
            </Button>
          </div>

          {/* Filters */}
          <div className="bg-[#111111] border border-[#2A2A2A] rounded-xl p-4 flex flex-col gap-3">
            <div className="flex items-center gap-2 text-sm text-[#A0A0A0]">
              <Calendar className="w-4 h-4" />
              <span>Filtrer par période</span>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                size="sm"
                variant={filterPreset === 'all' ? 'default' : 'outline'}
                className={filterPreset === 'all'
                  ? 'bg-[#D4AF37] text-black hover:bg-[#B8941F]'
                  : 'border-[#2A2A2A] text-[#EAEAEA] hover:bg-white/10'}
                onClick={() => setFilterPreset('all')}
              >
                Tout
              </Button>

              <Button
                type="button"
                size="sm"
                variant={filterPreset === 'day' ? 'default' : 'outline'}
                className={filterPreset === 'day'
                  ? 'bg-[#D4AF37] text-black hover:bg-[#B8941F]'
                  : 'border-[#2A2A2A] text-[#EAEAEA] hover:bg-white/10'}
                onClick={() => setFilterPreset('day')}
              >
                Aujourd’hui
              </Button>

              <Button
                type="button"
                size="sm"
                variant={filterPreset === '7d' ? 'default' : 'outline'}
                className={filterPreset === '7d'
                  ? 'bg-[#D4AF37] text-black hover:bg-[#B8941F]'
                  : 'border-[#2A2A2A] text-[#EAEAEA] hover:bg-white/10'}
                onClick={() => setFilterPreset('7d')}
              >
                7 jours
              </Button>

              <Button
                type="button"
                size="sm"
                variant={filterPreset === 'month' ? 'default' : 'outline'}
                className={filterPreset === 'month'
                  ? 'bg-[#D4AF37] text-black hover:bg-[#B8941F]'
                  : 'border-[#2A2A2A] text-[#EAEAEA] hover:bg-white/10'}
                onClick={() => setFilterPreset('month')}
              >
                Mois
              </Button>

              <Button
                type="button"
                size="sm"
                variant={filterPreset === 'year' ? 'default' : 'outline'}
                className={filterPreset === 'year'
                  ? 'bg-[#D4AF37] text-black hover:bg-[#B8941F]'
                  : 'border-[#2A2A2A] text-[#EAEAEA] hover:bg-white/10'}
                onClick={() => setFilterPreset('year')}
              >
                Année
              </Button>

              <Button
                type="button"
                size="sm"
                variant={filterPreset === 'custom' ? 'default' : 'outline'}
                className={filterPreset === 'custom'
                  ? 'bg-[#D4AF37] text-black hover:bg-[#B8941F]'
                  : 'border-[#2A2A2A] text-[#EAEAEA] hover:bg-white/10'}
                onClick={() => setFilterPreset('custom')}
              >
                Personnalisé
              </Button>
            </div>

            {filterPreset === 'custom' && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
                <div className="space-y-1">
                  <Label className="text-[#A0A0A0] text-xs">De</Label>
                  <Input
                    type="date"
                    value={customFrom}
                    onChange={(e) => setCustomFrom(e.target.value)}
                    className="bg-[#0B0B0B] border-[#2A2A2A] text-white"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[#A0A0A0] text-xs">À</Label>
                  <Input
                    type="date"
                    value={customTo}
                    onChange={(e) => setCustomTo(e.target.value)}
                    className="bg-[#0B0B0B] border-[#2A2A2A] text-white"
                  />
                </div>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    className="border-[#2A2A2A] text-white hover:bg-white/10"
                    onClick={clearCustomDates}
                  >
                    <X className="w-4 h-4 mr-2" />
                    Reset
                  </Button>
                </div>
              </div>
            )}

            <div className="text-xs text-[#777]">
              Affichées : <span className="text-[#D4AF37] font-semibold">{filteredRequests.length}</span> / {requests.length}
            </div>
          </div>

          {/* Table */}
          <div className="bg-[#1E1E1E] border border-[#2A2A2A] rounded-xl overflow-hidden shadow-xl">
            {loading ? (
              <div className="flex justify-center items-center py-20">
                <Loader2 className="w-8 h-8 animate-spin text-[#D4AF37]" />
              </div>
            ) : filteredRequests.length === 0 ? (
              <div className="text-center py-20 text-[#A0A0A0]">
                <User className="w-12 h-12 mx-auto mb-3 opacity-20" />
                <p>Aucune demande d'inscription pour cette période.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="bg-[#252525]">
                    <TableRow className="border-[#2A2A2A] hover:bg-transparent">
                      <TableHead className="text-[#A0A0A0]">{t('common.status')}</TableHead>
                      <TableHead className="text-[#A0A0A0]">Nom complet</TableHead>
                      <TableHead className="text-[#A0A0A0]">Contact</TableHead>
                      <TableHead className="text-[#A0A0A0]">Adresse</TableHead>
                      <TableHead className="text-[#A0A0A0]">{t('common.date')}</TableHead>
                      <TableHead className="text-right text-[#A0A0A0]">{t('common.actions')}</TableHead>
                    </TableRow>
                  </TableHeader>

                  <TableBody>
                    <AnimatePresence>
                      {filteredRequests.map((req) => {
                        const isCompleted = !!req.completed;
                        const isViewed = !!req.viewed;

                        const lock = hasExistingAccount(req);

                        return (
                          <motion.tr
                            key={req.id}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => openDetails(req)}
                            className={`
                              border-b border-[#2A2A2A] transition-colors cursor-pointer
                              ${isCompleted ? 'bg-[#0B0B0B]/60 opacity-70' : isViewed ? 'bg-[#0B0B0B]/40 opacity-85' : 'bg-[#1E1E1E] hover:bg-[#252525]'}
                            `}
                            title="Clique pour voir les détails"
                          >
                            <TableCell className="font-medium">
                              <div className="flex flex-col gap-1">
                                {statusBadge(req)}
                                {lock.blocked && (
                                  <div className="flex items-center gap-2 text-red-400 text-[11px] uppercase tracking-wider font-semibold">
                                    <Ban className="w-4 h-4" />
                                    <span>Compte existe</span>
                                  </div>
                                )}
                              </div>
                            </TableCell>

                            <TableCell>
                              <div className="font-medium text-white">
                                {req.nom} {req.prenom}
                              </div>
                            </TableCell>

                            <TableCell>
                              <div className="flex flex-col gap-1 text-sm">
                                <div
                                  className="flex items-center gap-2 text-[#EAEAEA] hover:text-[#D4AF37] cursor-pointer transition-colors"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleWhatsAppClick(req.whatsapp_number, req.nom);
                                  }}
                                  title="Ouvrir WhatsApp"
                                >
                                  <MessageCircle className="w-3.5 h-3.5" />
                                  {req.whatsapp_number}
                                </div>

                                {req.email && (
                                  <div className="flex items-center gap-2 text-[#A0A0A0]">
                                    <Mail className="w-3.5 h-3.5" />
                                    {req.email}
                                  </div>
                                )}
                              </div>
                            </TableCell>

                            <TableCell>
                              <div
                                className="flex items-center gap-2 text-[#A0A0A0] text-sm max-w-[240px] truncate"
                                title={req.adresse || ''}
                              >
                                <MapPin className="w-3.5 h-3.5 shrink-0" />
                                {req.adresse || '—'}
                              </div>
                            </TableCell>

                            <TableCell className="text-[#A0A0A0] text-sm whitespace-nowrap">
                              {new Date(req.created_at).toLocaleDateString()}{" "}
                              {new Date(req.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </TableCell>

                            <TableCell className="text-right">
                              <div className="flex justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                                {!isViewed && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="border-[#D4AF37] text-[#D4AF37] hover:bg-[#D4AF37] hover:text-black transition-colors"
                                    onClick={() => markAsViewed(req.id, req.viewed)}
                                    disabled={processingId === req.id}
                                  >
                                    {processingId === req.id ? (
                                      <Loader2 className="w-4 h-4 animate-spin" />
                                    ) : (
                                      <>
                                        <Eye className="w-4 h-4 mr-2" />
                                        Marquer vu
                                      </>
                                    )}
                                  </Button>
                                )}

                                {isViewed && !isCompleted && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="border-emerald-500 text-emerald-400 hover:bg-emerald-500 hover:text-black transition-colors"
                                    onClick={() => markAsCompleted(req.id, req.completed)}
                                    disabled={processingId === req.id}
                                    title="Marquer comme terminé"
                                  >
                                    {processingId === req.id ? (
                                      <Loader2 className="w-4 h-4 animate-spin" />
                                    ) : (
                                      <>
                                        <CheckCircle2 className="w-4 h-4 mr-2" />
                                        Terminer
                                      </>
                                    )}
                                  </Button>
                                )}

                                {(isViewed || isCompleted) && (
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="text-[#A0A0A0] hover:text-white hover:bg-white/10"
                                    onClick={() => handleWhatsAppClick(req.whatsapp_number, req.nom)}
                                  >
                                    <MessageCircle className="w-4 h-4 mr-2" />
                                    Contacter
                                  </Button>
                                )}
                              </div>
                            </TableCell>
                          </motion.tr>
                        );
                      })}
                    </AnimatePresence>
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Details Modal */}
      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="bg-[#141414] border-[#2A2A2A] text-white sm:max-w-[520px]">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-[#D4AF37]">
              Détails de la demande
            </DialogTitle>
            <DialogDescription className="text-[#A0A0A0]">
              Clique sur “Copier” pour récupérer une info rapidement.
            </DialogDescription>
          </DialogHeader>

          {selected ? (
            <div className="space-y-4 py-2">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-sm text-[#A0A0A0]">Statut</div>
                  <div className="mt-1 flex flex-col gap-2">
                    {statusBadge(selected)}
                    {hasExistingAccount(selected).blocked && (
                      <div className="flex items-center gap-2 text-red-400 text-xs uppercase tracking-wider font-semibold">
                        <Ban className="w-4 h-4" />
                        <span>{hasExistingAccount(selected).reason}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-sm text-[#A0A0A0]">Date</div>
                  <div className="mt-1 text-sm text-white">
                    {new Date(selected.created_at).toLocaleDateString()}{" "}
                    {new Date(selected.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              </div>

              <div className="bg-[#0B0B0B] border border-[#2A2A2A] rounded-xl p-4 space-y-3">
                <div className="flex items-center gap-2 text-white">
                  <User className="w-4 h-4 text-[#D4AF37]" />
                  <span className="font-semibold">{selected.nom} {selected.prenom}</span>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 text-sm text-[#EAEAEA]">
                      <MessageCircle className="w-4 h-4 text-[#A0A0A0]" />
                      <span>{selected.whatsapp_number || '—'}</span>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-[#2A2A2A] text-white hover:bg-white/10"
                      onClick={() => copyToClipboard(selected.whatsapp_number, 'whatsapp')}
                      disabled={!selected.whatsapp_number}
                    >
                      {copiedKey === 'whatsapp' ? <Check className="w-4 h-4 mr-2" /> : <Copy className="w-4 h-4 mr-2" />}
                      Copier
                    </Button>
                  </div>

                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 text-sm text-[#EAEAEA]">
                      <Mail className="w-4 h-4 text-[#A0A0A0]" />
                      <span className="truncate max-w-[280px]">{selected.email || '—'}</span>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-[#2A2A2A] text-white hover:bg-white/10"
                      onClick={() => copyToClipboard(selected.email, 'email')}
                      disabled={!selected.email}
                    >
                      {copiedKey === 'email' ? <Check className="w-4 h-4 mr-2" /> : <Copy className="w-4 h-4 mr-2" />}
                      Copier
                    </Button>
                  </div>

                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-2 text-sm text-[#EAEAEA]">
                      <MapPin className="w-4 h-4 text-[#A0A0A0] mt-0.5" />
                      <span className="break-words">{selected.adresse || '—'}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="py-8 flex items-center justify-center text-[#A0A0A0]">
              <Loader2 className="w-5 h-5 animate-spin mr-2" />
              Chargement...
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            {selected && !selected.viewed && (
              <Button
                variant="outline"
                className="border-[#D4AF37] text-[#D4AF37] hover:bg-[#D4AF37] hover:text-black"
                onClick={() => markAsViewed(selected.id, selected.viewed)}
                disabled={processingId === selected.id}
              >
                {processingId === selected.id ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <Eye className="w-4 h-4 mr-2" />
                    Marquer vu
                  </>
                )}
              </Button>
            )}

            {selected && selected.viewed && !selected.completed && (
              <Button
                variant="outline"
                className="border-emerald-500 text-emerald-400 hover:bg-emerald-500 hover:text-black"
                onClick={() => markAsCompleted(selected.id, selected.completed)}
                disabled={processingId === selected.id}
              >
                {processingId === selected.id ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4 mr-2" />
                    Terminer
                  </>
                )}
              </Button>
            )}

            {selected && (
              <Button
                className={`bg-[#D4AF37] text-black hover:bg-[#B8941F] ${
                  hasExistingAccount(selected).blocked ? 'opacity-50 cursor-not-allowed hover:bg-[#D4AF37]' : ''
                }`}
                onClick={() => goCreateAccountWithPrefill(selected)}
                disabled={hasExistingAccount(selected).blocked}
                title={
                  hasExistingAccount(selected).blocked
                    ? hasExistingAccount(selected).reason
                    : "Créer un compte avec ces infos"
                }
              >
                {hasExistingAccount(selected).blocked ? (
                  <>
                    <Ban className="w-4 h-4 mr-2" />
                    Compte existe déjà
                  </>
                ) : (
                  <>
                    <UserPlus className="w-4 h-4 mr-2" />
                    Créer compte
                  </>
                )}
              </Button>
            )}

            <Button
              variant="outline"
              className="border-[#2A2A2A] text-white hover:bg-white/10"
              onClick={() => setDetailsOpen(false)}
            >
              Fermer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

// tiny inline icon to avoid extra imports changes
const RefreshIcon = () => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className="mr-2"
  >
    <path
      d="M20 12a8 8 0 1 1-2.343-5.657"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    />
    <path
      d="M20 4v6h-6"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

export default RegistrationRequestsList;