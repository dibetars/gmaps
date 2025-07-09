import React, { useEffect, useState } from 'react';
import { agentService, type Agent } from '../../services/agentService';
import styles from './AgentApprovals.module.css';

const AgentApprovals: React.FC = () => {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingAgentId, setUpdatingAgentId] = useState<number | null>(null);
  const [refreshKey, setRefreshKey] = useState(0); // Add refresh key for triggering refresh

  useEffect(() => {
    fetchAgents();
  }, [refreshKey]); // Add refreshKey as dependency

  const fetchAgents = async () => {
    try {
      setError(null); // Clear any previous errors
      const data = await agentService.getAllAgents();
      setAgents(data);
    } catch (err) {
      setError('Failed to fetch agents');
    } finally {
      setLoading(false);
    }
  };

  const handleApproval = async (agent: Agent) => {
    if (agent.approved) return;
    
    try {
      setError(null); // Clear any previous errors
      setUpdatingAgentId(agent.id);
      await agentService.updateAgentStatus({
        ...agent,
        approved: true
      });
      
      // Trigger refresh instead of updating state directly
      setRefreshKey(prev => prev + 1);
    } catch (err) {
      setError('Failed to approve agent');
    } finally {
      setUpdatingAgentId(null);
    }
  };

  if (loading && !updatingAgentId) return <div>Loading...</div>;
  if (error) return <div className={styles.error}>{error}</div>;

  const pendingAgents = agents.filter(agent => !agent.approved);
  const approvedAgents = agents.filter(agent => agent.approved);

  return (
    <div className={styles.container}>
      <h2 className={styles.title}>Agent Approvals</h2>
      
      {pendingAgents.length > 0 && (
        <>
          <h3 className={styles.sectionTitle}>Pending Approval ({pendingAgents.length})</h3>
          <div className={styles.agentList}>
            {pendingAgents.map((agent) => (
              <div key={agent.id} className={styles.agentCard}>
                <div className={styles.agentInfo}>
                  <h3>{agent.full_name}</h3>
                  <p><strong>Email:</strong> {agent.email}</p>
                  <p><strong>Location:</strong> {agent.location}</p>
                  <p><strong>Education:</strong> {agent.education_level}</p>
                  <p><strong>Contact:</strong> {agent.whatsapp_number}</p>
                </div>
                <div className={styles.agentActions}>
                  <button
                    className={`${styles.approvalButton} ${styles.pending}`}
                    onClick={() => handleApproval(agent)}
                    disabled={updatingAgentId === agent.id}
                  >
                    {updatingAgentId === agent.id ? (
                      <span className={styles.loadingSpinner}>⌛</span>
                    ) : (
                      'Approve Agent'
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {approvedAgents.length > 0 && (
        <>
          <h3 className={styles.sectionTitle}>Approved Agents ({approvedAgents.length})</h3>
          <div className={styles.agentList}>
            {approvedAgents.map((agent) => (
              <div key={agent.id} className={`${styles.agentCard} ${styles.approvedCard}`}>
                <div className={styles.agentInfo}>
                  <h3>{agent.full_name}</h3>
                  <p><strong>Email:</strong> {agent.email}</p>
                  <p><strong>Location:</strong> {agent.location}</p>
                  <p><strong>Education:</strong> {agent.education_level}</p>
                  <p><strong>Contact:</strong> {agent.whatsapp_number}</p>
                </div>
                <div className={styles.agentActions}>
                  <div className={styles.approvedBadge}>
                    <span className={styles.approvedIcon}>✓</span> Approved
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {agents.length === 0 && (
        <div className={styles.emptyState}>
          No agents found
        </div>
      )}
    </div>
  );
};

export default AgentApprovals; 