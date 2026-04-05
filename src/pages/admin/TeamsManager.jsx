import React, { useState } from 'react';
import { Helmet } from 'react-helmet';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Users, UserPlus, Trash2, ArrowRightLeft, Shield, User, Loader2 } from 'lucide-react';
import { useTeams } from '@/hooks/useTeams';
import { useAgents } from '@/hooks/useAgents';

const TeamsManager = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { teams, createTeam, deleteTeam } = useTeams();
  const { agents, workers, assignAgent, moveAgent } = useAgents();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [isMoveModalOpen, setIsMoveModalOpen] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState(null);
  
  // Form states
  const [newTeamName, setNewTeamName] = useState('');
  const [selectedWorker, setSelectedWorker] = useState('');
  const [selectedAgent, setSelectedAgent] = useState('');
  const [targetTeam, setTargetTeam] = useState('');
  const [processing, setProcessing] = useState(false);

  const handleCreateTeam = async () => {
    if (!newTeamName || !selectedWorker) return;
    setProcessing(true);
    const success = await createTeam(selectedWorker, newTeamName);
    if (success) {
      setIsCreateModalOpen(false);
      setNewTeamName('');
      setSelectedWorker('');
    }
    setProcessing(false);
  };

  const handleAssignAgent = async () => {
    if (!selectedAgent || !selectedTeam) return;
    setProcessing(true);
    const success = await assignAgent(selectedAgent, selectedTeam.id);
    if (success) {
      setIsAssignModalOpen(false);
      setSelectedAgent('');
      setSelectedTeam(null);
    }
    setProcessing(false);
  };

  const handleMoveAgent = async () => {
    if (!selectedAgent || !targetTeam) return;
    setProcessing(true);
    const success = await moveAgent(selectedAgent, targetTeam);
    if (success) {
      setIsMoveModalOpen(false);
      setSelectedAgent('');
      setTargetTeam('');
    }
    setProcessing(false);
  };

  const handleDeleteTeam = async (id) => {
    if (window.confirm(t('common.confirm'))) {
      await deleteTeam(id);
    }
  };

  // Only show agents who are NOT currently assigned to a worker/team for the "Add" modal
  const unassignedAgents = agents.filter(a => !a.associated_worker);

  // For the "Move" modal, only show agents who ARE assigned
  const assignedAgents = agents.filter(a => a.associated_worker);

  // Get current team of selected agent for display
  const getAgentCurrentTeam = (agentId) => {
    return teams.find(team => team.agents_assignes?.includes(agentId));
  };

  const selectedAgentCurrentTeam = selectedAgent ? getAgentCurrentTeam(selectedAgent) : null;

  return (
    <>
      <Helmet>
        <title>{t('teams.title')} - Admin - VS XPRESS</title>
      </Helmet>

      <div className="min-h-screen bg-[#0B0B0B] p-6">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <Button
              onClick={() => navigate('/admin/dashboard')}
              variant="ghost"
              className="text-[#A0A0A0] hover:text-[#D4AF37] mb-4"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              {t('common.back')}
            </Button>
            
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div>
                <h1 className="text-3xl font-bold text-[#FFFFFF]">{t('teams.title')}</h1>
                <div className="flex gap-4 text-sm text-[#A0A0A0] mt-2">
                  <span>{t('dashboard.admin.stats.totalTeams')}: <span className="text-[#D4AF37]">{teams.length}</span></span>
                  <span>|</span>
                  <span>{t('dashboard.admin.stats.activeUsers')}: <span className="text-[#D4AF37]">{agents.length}</span></span>
                </div>
              </div>

              <div className="flex gap-2">
                <Dialog open={isMoveModalOpen} onOpenChange={setIsMoveModalOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline" className="border-[#2A2A2A] text-[#A0A0A0] hover:text-[#D4AF37]">
                      <ArrowRightLeft className="w-4 h-4 mr-2" />
                      {t('teams.moveAgent')}
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="bg-[#1E1E1E] border-[#2A2A2A] text-white">
                    <DialogHeader>
                      <DialogTitle>{t('teams.moveAgent')}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 pt-4">
                      <div className="space-y-2">
                        <Label>{t('forms.selectAgent')}</Label>
                        <Select onValueChange={setSelectedAgent} value={selectedAgent}>
                          <SelectTrigger className="bg-[#0B0B0B] border-[#2A2A2A]">
                            <SelectValue placeholder={t('forms.selectAgent')} />
                          </SelectTrigger>
                          <SelectContent className="bg-[#1E1E1E] border-[#2A2A2A]">
                            {assignedAgents.length === 0 ? (
                               <div className="p-2 text-sm text-[#A0A0A0]">Aucun agent assigné disponible</div>
                            ) : assignedAgents.map(agent => {
                              const currentTeam = getAgentCurrentTeam(agent.id);
                              return (
                                <SelectItem key={agent.id} value={agent.id}>
                                  {agent.prenom} {agent.nom} {currentTeam ? `(${currentTeam.nom})` : ''}
                                </SelectItem>
                              );
                            })}
                          </SelectContent>
                        </Select>
                        
                        {/* Show current team */}
                        {selectedAgentCurrentTeam && (
                          <div className="bg-[#0B0B0B] border border-[#2A2A2A] rounded-lg p-3">
                            <p className="text-xs text-[#A0A0A0] mb-1">Équipe actuelle:</p>
                            <p className="text-sm text-white font-medium">{selectedAgentCurrentTeam.nom}</p>
                          </div>
                        )}
                      </div>

                      <div className="space-y-2">
                        <Label>{t('teams.targetTeam')}</Label>
                        <Select onValueChange={setTargetTeam} value={targetTeam}>
                          <SelectTrigger className="bg-[#0B0B0B] border-[#2A2A2A]">
                            <SelectValue placeholder={t('teams.targetTeam')} />
                          </SelectTrigger>
                          <SelectContent className="bg-[#1E1E1E] border-[#2A2A2A]">
                            {teams
                              .filter(team => team.id !== selectedAgentCurrentTeam?.id) // Exclude current team
                              .map(team => (
                                <SelectItem key={team.id} value={team.id}>
                                  {team.nom}
                                </SelectItem>
                              ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Confirmation message */}
                      {selectedAgent && targetTeam && selectedAgentCurrentTeam && (
                        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3">
                          <p className="text-xs text-yellow-500">
                            ⚠️ L'agent sera retiré de "{selectedAgentCurrentTeam.nom}" et ajouté à "{teams.find(t => t.id === targetTeam)?.nom}"
                          </p>
                        </div>
                      )}

                      <Button 
                        onClick={handleMoveAgent} 
                        disabled={processing || !selectedAgent || !targetTeam}
                        className="w-full bg-[#D4AF37] text-black hover:bg-[#B8941F]"
                      >
                        {processing ? <Loader2 className="animate-spin w-4 h-4" /> : t('teams.moveAgent')}
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>

                <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
                  <DialogTrigger asChild>
                    <Button className="bg-[#D4AF37] hover:bg-[#B8941F] text-[#0B0B0B] gold-glow-btn">
                      <UserPlus className="w-4 h-4 mr-2" />
                      {t('teams.create')}
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="bg-[#1E1E1E] border-[#2A2A2A] text-white">
                    <DialogHeader>
                      <DialogTitle>{t('teams.newTeam')}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 pt-4">
                      <div className="space-y-2">
                        <Label>{t('teams.teamName')}</Label>
                        <Input 
                          value={newTeamName}
                          onChange={(e) => setNewTeamName(e.target.value)}
                          placeholder="e.g. Santiago Alpha Team"
                          className="bg-[#0B0B0B] border-[#2A2A2A]"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>{t('teams.leader')}</Label>
                        <Select onValueChange={setSelectedWorker} value={selectedWorker}>
                          <SelectTrigger className="bg-[#0B0B0B] border-[#2A2A2A]">
                            <SelectValue placeholder={t('forms.selectWorker')} />
                          </SelectTrigger>
                          <SelectContent className="bg-[#1E1E1E] border-[#2A2A2A]">
                            {workers.map(worker => (
                              <SelectItem key={worker.id} value={worker.id}>
                                {worker.prenom} {worker.nom}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <Button 
                        onClick={handleCreateTeam} 
                        disabled={processing || !newTeamName || !selectedWorker}
                        className="w-full bg-[#D4AF37] text-black hover:bg-[#B8941F]"
                      >
                        {processing ? <Loader2 className="animate-spin w-4 h-4" /> : t('teams.create')}
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </div>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {teams.map((team, index) => (
              <motion.div
                key={team.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="bg-[#1E1E1E] rounded-xl p-6 border border-[#2A2A2A] hover:border-[#D4AF37] transition-all group"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="bg-[#D4AF37]/10 p-3 rounded-lg">
                    <Users className="w-6 h-6 text-[#D4AF37]" />
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleDeleteTeam(team.id)}
                    className="text-[#A0A0A0] hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>

                <h3 className="text-xl font-bold text-[#FFFFFF] mb-2">{team.nom}</h3>
                
                <div className="flex items-center gap-2 mb-4 text-sm text-[#A0A0A0]">
                  <Shield className="w-4 h-4 text-[#D4AF37]" />
                  <span>
                    {t('teams.leader')}: <span className="text-white font-medium">{team.worker ? `${team.worker.prenom} ${team.worker.nom}` : 'Unknown'}</span>
                  </span>
                </div>

                <div className="border-t border-[#2A2A2A] pt-4 mt-4">
                  <div className="flex justify-between items-center mb-3">
                    <span className="text-[#A0A0A0] text-sm">{t('tables.members')} ({team.agents_assignes?.length || 0})</span>
                    <Dialog open={isAssignModalOpen && selectedTeam?.id === team.id} onOpenChange={(open) => {
                      setIsAssignModalOpen(open);
                      if (!open) setSelectedTeam(null);
                      else setSelectedTeam(team);
                    }}>
                      <DialogTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-6 text-[#D4AF37] hover:text-[#B8941F] hover:bg-[#D4AF37]/10 text-xs px-2">
                          <UserPlus className="w-3 h-3 mr-1" /> {t('teams.addAgent')}
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="bg-[#1E1E1E] border-[#2A2A2A] text-white">
                        <DialogHeader>
                          <DialogTitle>{t('teams.addAgent')}</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4 pt-4">
                          <div className="space-y-2">
                            <Label>{t('forms.selectAgent')}</Label>
                            <Select onValueChange={setSelectedAgent} value={selectedAgent}>
                              <SelectTrigger className="bg-[#0B0B0B] border-[#2A2A2A]">
                                <SelectValue placeholder={t('forms.selectAgent')} />
                              </SelectTrigger>
                              <SelectContent className="bg-[#1E1E1E] border-[#2A2A2A]">
                                {unassignedAgents.length === 0 ? (
                                  <div className="p-2 text-sm text-[#A0A0A0]">{t('teams.noAgents')}</div>
                                ) : (
                                  unassignedAgents.map(agent => (
                                    <SelectItem key={agent.id} value={agent.id}>
                                      {agent.prenom} {agent.nom}
                                    </SelectItem>
                                  ))
                                )}
                              </SelectContent>
                            </Select>
                          </div>
                          <Button 
                            onClick={handleAssignAgent} 
                            disabled={processing || !selectedAgent}
                            className="w-full bg-[#D4AF37] text-black hover:bg-[#B8941F]"
                          >
                            {processing ? <Loader2 className="animate-spin w-4 h-4" /> : t('teams.addAgent')}
                          </Button>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>

                  <div className="space-y-2 max-h-32 overflow-y-auto pr-2 custom-scrollbar">
                    {agents.filter(a => team.agents_assignes?.includes(a.id)).map(agent => (
                      <div key={agent.id} className="flex items-center gap-2 text-sm bg-[#0B0B0B] p-2 rounded border border-[#2A2A2A]">
                        <User className="w-3 h-3 text-[#A0A0A0]" />
                        <span className="text-[#E0E0E0]">{agent.prenom} {agent.nom}</span>
                      </div>
                    ))}
                    {(!team.agents_assignes || team.agents_assignes.length === 0) && (
                      <p className="text-xs text-[#A0A0A0] italic">{t('teams.noAgents')}</p>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
};

export default TeamsManager;