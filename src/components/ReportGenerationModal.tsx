import { useState } from 'react';
import type { Place } from '../types';
import styles from './ReportGenerationModal.module.css';

interface WeeklyReport {
  totalVisits: number;
  visitsByDay: {
    [date: string]: {
      count: number;
      places: Place[];
    };
  };
}

type Step = 'start' | 'dateRange' | 'preview' | 'complete';

interface ReportGenerationModalProps {
  places: Place[];
  onClose: () => void;
}

export const ReportGenerationModal = ({ places, onClose }: ReportGenerationModalProps) => {
  const [currentStep, setCurrentStep] = useState<Step>('start');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [weeklyReport, setWeeklyReport] = useState<WeeklyReport | null>(null);

  const handleNext = () => {
    switch (currentStep) {
      case 'start':
        setCurrentStep('dateRange');
        break;
      case 'dateRange':
        generateReport();
        setCurrentStep('preview');
        break;
      case 'preview':
        setCurrentStep('complete');
        break;
      case 'complete':
        onClose();
        break;
    }
  };

  const handleBack = () => {
    switch (currentStep) {
      case 'dateRange':
        setCurrentStep('start');
        break;
      case 'preview':
        setCurrentStep('dateRange');
        break;
      case 'complete':
        setCurrentStep('preview');
        break;
    }
  };

  const generateReport = () => {
    const visitsByDay: { [date: string]: { count: number; places: Place[] } } = {};
    let totalVisits = 0;

    places.forEach(place => {
      if (place.date_visited) {
        const visitDate = new Date(place.date_visited);
        const dateStr = visitDate.toISOString().split('T')[0];

        if (!visitsByDay[dateStr]) {
          visitsByDay[dateStr] = { count: 0, places: [] };
        }

        visitsByDay[dateStr].count++;
        visitsByDay[dateStr].places.push(place);
        totalVisits++;
      }
    });

    setWeeklyReport({
      totalVisits,
      visitsByDay
    });
  };

  const downloadReport = () => {
    if (!weeklyReport) return;

    const reportLines = [
      'Weekly Visits Report',
      '==================',
      `Total Visits: ${weeklyReport.totalVisits}`,
      '',
      'Visits by Day:',
      '-------------'
    ];

    Object.entries(weeklyReport.visitsByDay).forEach(([date, data]) => {
      const formattedDate = new Date(date).toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
      
      reportLines.push(
        `\n${formattedDate}`,
        `Visits: ${data.count}`,
        'Places visited:'
      );

      data.places.forEach(place => {
        reportLines.push(`- ${place.name} (${place.address})`);
      });
    });

    const reportContent = reportLines.join('\n');
    const blob = new Blob([reportContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `weekly-report-${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 'start':
        return (
          <div className={styles.stepContent}>
            <h3>Welcome to Report Generation</h3>
            <p>This tool will help you generate a detailed report of your visits.</p>
            <div className={styles.stepActions}>
              <button 
                className={styles.primaryButton}
                onClick={handleNext}
              >
                Get Started
              </button>
            </div>
          </div>
        );

      case 'dateRange':
        return (
          <div className={styles.stepContent}>
            <h3>Select Date Range</h3>
            <div className={styles.formGroup}>
              <label htmlFor="startDate">Start Date</label>
              <input
                type="date"
                id="startDate"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className={styles.dateInput}
              />
            </div>
            <div className={styles.formGroup}>
              <label htmlFor="endDate">End Date</label>
              <input
                type="date"
                id="endDate"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className={styles.dateInput}
              />
            </div>
            <div className={styles.stepActions}>
              <button 
                className={styles.secondaryButton}
                onClick={handleBack}
              >
                Back
              </button>
              <button 
                className={styles.primaryButton}
                onClick={handleNext}
                disabled={!startDate || !endDate}
              >
                Generate Report
              </button>
            </div>
          </div>
        );

      case 'preview':
        return (
          <div className={styles.stepContent}>
            <h3>Report Preview</h3>
            {weeklyReport && (
              <div className={styles.reportPreview}>
                <div className={styles.reportSummary}>
                  <h4>Summary</h4>
                  <p>Total Visits: {weeklyReport.totalVisits}</p>
                </div>
                <div className={styles.visitsByDay}>
                  <h4>Visits by Day</h4>
                  {Object.entries(weeklyReport.visitsByDay).map(([date, data]) => (
                    <div key={date} className={styles.dayEntry}>
                      <h5>
                        {new Date(date).toLocaleDateString('en-US', {
                          weekday: 'long',
                          month: 'long',
                          day: 'numeric'
                        })}
                      </h5>
                      <p>Visits: {data.count}</p>
                      {data.places.length > 0 && (
                        <ul>
                          {data.places.map(place => (
                            <li key={place.id}>
                              {place.name} - {place.address}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
            <div className={styles.stepActions}>
              <button 
                className={styles.secondaryButton}
                onClick={handleBack}
              >
                Back
              </button>
              <button 
                className={styles.primaryButton}
                onClick={() => {
                  downloadReport();
                  handleNext();
                }}
              >
                Download Report
              </button>
            </div>
          </div>
        );

      case 'complete':
        return (
          <div className={styles.stepContent}>
            <h3>Report Generated Successfully!</h3>
            <p>Your report has been downloaded.</p>
            <div className={styles.stepActions}>
              <button 
                className={styles.primaryButton}
                onClick={onClose}
              >
                Done
              </button>
            </div>
          </div>
        );
    }
  };

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modalContent} onClick={e => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h2>Generate Report</h2>
          <button className={styles.closeButton} onClick={onClose}>×</button>
        </div>

        <div className={styles.stepIndicator}>
          <div className={`${styles.step} ${currentStep === 'start' ? styles.active : ''}`}>1</div>
          <div className={styles.stepLine}></div>
          <div className={`${styles.step} ${currentStep === 'dateRange' ? styles.active : ''}`}>2</div>
          <div className={styles.stepLine}></div>
          <div className={`${styles.step} ${currentStep === 'preview' ? styles.active : ''}`}>3</div>
          <div className={styles.stepLine}></div>
          <div className={`${styles.step} ${currentStep === 'complete' ? styles.active : ''}`}>4</div>
        </div>

        {renderStepContent()}
      </div>
    </div>
  );
}; 