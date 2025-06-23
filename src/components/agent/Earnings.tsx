import React, { useState, useEffect } from 'react';
import styles from '../Dashboard.module.css';

interface EarningsStats {
  totalEarnings: number;
  monthlyEarnings: number;
  pendingPayouts: number;
  completedPayouts: number;
}

interface EarningActivity {
  restaurant: string;
  amount: number;
  status: 'completed' | 'pending' | 'processing';
  timestamp: string;
}

interface EarningsData {
  date: string;
  amount: number;
}

const Earnings: React.FC = () => {
  const [stats, setStats] = useState<EarningsStats>({
    totalEarnings: 15250,
    monthlyEarnings: 3200,
    pendingPayouts: 850,
    completedPayouts: 14400
  });
  const [recentActivity, setRecentActivity] = useState<EarningActivity[]>([]);
  const [earningsData, setEarningsData] = useState<EarningsData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async (isBackgroundRefresh = false) => {
    try {
      if (!isBackgroundRefresh) {
        setLoading(true);
      }
      setError(null);

      // Mock earnings data - replace with actual API call
      const mockEarningsData: EarningsData[] = [
        { date: '2024-03-10', amount: 450 },
        { date: '2024-03-11', amount: 520 },
        { date: '2024-03-12', amount: 380 },
        { date: '2024-03-13', amount: 600 },
        { date: '2024-03-14', amount: 480 },
        { date: '2024-03-15', amount: 550 },
        { date: '2024-03-16', amount: 220 }
      ];

      // Mock activity data
      const mockActivity: EarningActivity[] = [
        {
          restaurant: "Tasty Kitchen",
          amount: 150,
          status: "completed",
          timestamp: new Date().toISOString()
        },
        {
          restaurant: "Spice House",
          amount: 200,
          status: "pending",
          timestamp: new Date().toISOString()
        },
        {
          restaurant: "Local Delights",
          amount: 180,
          status: "processing",
          timestamp: new Date().toISOString()
        }
      ];

      setEarningsData(mockEarningsData);
      setRecentActivity(mockActivity);
    } catch (err) {
      setError('Failed to fetch earnings data');
      console.error('Error fetching earnings data:', err);
    } finally {
      if (!isBackgroundRefresh) {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    fetchData();
    const intervalId = setInterval(() => fetchData(true), 30000);
    return () => clearInterval(intervalId);
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return '#22c55e';
      case 'pending':
        return '#eab308';
      case 'processing':
        return '#3b82f6';
      default:
        return '#6b7280';
    }
  };

  if (loading) {
    return (
      <div className={styles.dashboard}>
        <h1 className={styles.title}>Earnings</h1>
        <div className={styles.loading}>Loading earnings data...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.dashboard}>
        <h1 className={styles.title}>Earnings</h1>
        <div className={styles.error}>{error}</div>
      </div>
    );
  }

  const maxAmount = Math.max(...earningsData.map(d => d.amount));
  const totalAmount = earningsData.reduce((sum, data) => sum + data.amount, 0);

  return (
    <div className={styles.dashboard}>
      <h1 className={styles.title}>Earnings</h1>
      
      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <h3>Total Earnings</h3>
          <p className={styles.statValue}>${stats.totalEarnings}</p>
          <p className={styles.statLabel}>All time earnings</p>
        </div>

        <div className={styles.statCard}>
          <h3>Monthly Earnings</h3>
          <p className={styles.statValue}>${stats.monthlyEarnings}</p>
          <p className={styles.statLabel}>This month</p>
        </div>

        <div className={styles.statCard}>
          <h3>Pending Payouts</h3>
          <p className={styles.statValue}>${stats.pendingPayouts}</p>
          <p className={styles.statLabel}>To be processed</p>
        </div>

        <div className={styles.statCard}>
          <h3>Completed Payouts</h3>
          <p className={styles.statValue}>${stats.completedPayouts}</p>
          <p className={styles.statLabel}>Successfully paid</p>
        </div>
      </div>

      <div className={styles.recentActivity}>
        <h2>Weekly Earnings</h2>
        <div style={{ 
          display: 'flex', 
          alignItems: 'end', 
          justifyContent: 'space-between', 
          height: '200px', 
          marginBottom: '1.5rem',
          padding: '1rem 0'
        }}>
          {earningsData.map((data, index) => (
            <div 
              key={index} 
              style={{ 
                display: 'flex', 
                flexDirection: 'column', 
                alignItems: 'center', 
                flex: 1,
                marginRight: index < earningsData.length - 1 ? '0.5rem' : '0'
              }}
            >
              <div
                style={{
                  width: '100%',
                  maxWidth: '40px',
                  backgroundColor: '#3b82f6',
                  borderRadius: '4px 4px 0 0',
                  transition: 'all 0.3s ease',
                  cursor: 'pointer',
                  height: `${(data.amount / maxAmount) * 150}px`,
                  minHeight: '8px'
                }}
                title={`$${data.amount} on ${new Date(data.date).toLocaleDateString('en-US', { weekday: 'short' })}`}
              />
              <div style={{ 
                marginTop: '0.75rem', 
                textAlign: 'center',
                fontSize: '0.875rem'
              }}>
                <p style={{ 
                  fontWeight: '600', 
                  color: '#1f2937', 
                  margin: 0,
                  marginBottom: '0.25rem'
                }}>
                  ${data.amount}
                </p>
                <p style={{ 
                  fontSize: '0.75rem', 
                  color: '#6b7280', 
                  margin: 0 
                }}>
                  {new Date(data.date).toLocaleDateString('en-US', { weekday: 'short' })}
                </p>
              </div>
            </div>
          ))}
        </div>
        <div style={{ 
          borderTop: '1px solid #e5e7eb', 
          paddingTop: '1rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div>
            <span style={{ fontSize: '0.875rem', color: '#6b7280' }}>
              Total this week:
            </span>
            <span style={{ 
              fontSize: '1.125rem', 
              fontWeight: 'bold', 
              color: '#1f2937',
              marginLeft: '0.5rem'
            }}>
              ${totalAmount}
            </span>
          </div>
          <div style={{ fontSize: '0.75rem', color: '#9ca3af' }}>
            Average: ${(totalAmount / earningsData.length).toFixed(2)} per day
          </div>
        </div>
      </div>

      <div className={styles.recentActivity}>
        <h2>Recent Transactions</h2>
        <div className={styles.activityList}>
          {recentActivity.length > 0 ? (
            recentActivity.map((activity, index) => (
              <div key={index} className={styles.activityItem}>
                <div 
                  className={styles.activityIcon}
                  style={{
                    backgroundColor: getStatusColor(activity.status)
                  }}
                >
                  {activity.status === 'completed' ? '✓' : 
                   activity.status === 'pending' ? '⌛' : '↻'}
                </div>
                <div className={styles.activityDetails}>
                  <h4>{activity.restaurant}</h4>
                  <p>
                    ${activity.amount} - {activity.status.charAt(0).toUpperCase() + activity.status.slice(1)} on{' '}
                    {new Date(activity.timestamp).toLocaleDateString()}
                  </p>
                </div>
              </div>
            ))
          ) : (
            <p className={styles.emptyState}>No recent transactions to display</p>
          )}
        </div>
      </div>

      <div className={styles.quickActions}>
        <h2>Quick Actions</h2>
        <div className={styles.actionButtons}>
          <button className={styles.actionButton}>
            Request Payout
          </button>
          <button className={styles.actionButton}>
            View Statement
          </button>
          <button className={styles.actionButton}>
            Download Report
          </button>
        </div>
      </div>
    </div>
  );
};

export default Earnings; 