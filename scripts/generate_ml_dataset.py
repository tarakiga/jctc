"""
ML Dataset Generator for JCTC Case Management System

Generates synthetic datasets for:
1. Classification (case outcome, priority, type)
2. Anomaly Detection (unusual case patterns, evidence chain breaks)
3. Prediction (case duration, resource needs, conviction probability)
"""

import pandas as pd
import numpy as np
from datetime import datetime, timedelta
import json
import random
from pathlib import Path


# Seed for reproducibility
np.random.seed(42)
random.seed(42)


class JCTCDatasetGenerator:
    """Generate synthetic JCTC case management data for ML training"""
    
    def __init__(self, n_cases=5000, n_evidence=15000, n_tasks=20000):
        self.n_cases = n_cases
        self.n_evidence = n_evidence
        self.n_tasks = n_tasks
        
        # Case categories and attributes
        self.case_types = [
            'CYBERBULLYING', 'FRAUD', 'HACKING', 'IDENTITY_THEFT', 
            'ONLINE_SCAM', 'DATA_BREACH', 'RANSOMWARE', 'PHISHING',
            'CHILD_EXPLOITATION', 'TERRORISM'
        ]
        
        self.case_priorities = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']
        
        self.case_statuses = [
            'REPORTED', 'UNDER_INVESTIGATION', 'EVIDENCE_COLLECTION',
            'ANALYSIS', 'PROSECUTION_PENDING', 'CLOSED_CONVICTED',
            'CLOSED_DISMISSED', 'CLOSED_NO_EVIDENCE'
        ]
        
        self.evidence_types = [
            'DIGITAL_DEVICE', 'NETWORK_LOG', 'EMAIL_COMMUNICATION',
            'SOCIAL_MEDIA', 'FINANCIAL_RECORD', 'PHYSICAL_DOCUMENT',
            'WITNESS_STATEMENT', 'FORENSIC_IMAGE', 'MALWARE_SAMPLE',
            'CHAT_LOG', 'VIDEO_EVIDENCE', 'AUDIO_RECORDING'
        ]
        
        self.user_roles = [
            'INVESTIGATOR', 'FORENSIC_ANALYST', 'CASE_MANAGER',
            'PROSECUTOR', 'ADMIN', 'DATA_ANALYST', 'LEGAL_OFFICER'
        ]
        
        # Realistic correlations
        self.priority_weights = {
            'CHILD_EXPLOITATION': [0.05, 0.10, 0.25, 0.60],  # Mostly CRITICAL
            'TERRORISM': [0.05, 0.10, 0.30, 0.55],
            'RANSOMWARE': [0.10, 0.20, 0.40, 0.30],
            'DATA_BREACH': [0.10, 0.25, 0.45, 0.20],
            'HACKING': [0.15, 0.35, 0.35, 0.15],
            'FRAUD': [0.20, 0.40, 0.30, 0.10],
            'IDENTITY_THEFT': [0.15, 0.35, 0.35, 0.15],
            'PHISHING': [0.25, 0.40, 0.25, 0.10],
            'ONLINE_SCAM': [0.30, 0.40, 0.20, 0.10],
            'CYBERBULLYING': [0.40, 0.35, 0.20, 0.05]
        }
        
    def generate_cases_dataset(self):
        """Generate synthetic case data with realistic patterns"""
        cases = []
        
        for case_id in range(1, self.n_cases + 1):
            case_type = random.choice(self.case_types)
            priority = np.random.choice(
                self.case_priorities,
                p=self.priority_weights[case_type]
            )
            
            # Date ranges
            created_date = datetime(2020, 1, 1) + timedelta(
                days=random.randint(0, 1800)
            )
            
            # Case duration depends on type and priority
            base_duration = self._get_base_duration(case_type, priority)
            duration_days = max(1, int(np.random.normal(base_duration, base_duration * 0.3)))
            
            # Determine if case has anomalies (for anomaly detection training)
            is_anomaly = random.random() < 0.05  # 5% anomalies
            if is_anomaly:
                duration_days = int(duration_days * random.uniform(2.5, 5.0))
            
            # Status progression
            status = self._determine_status(created_date, duration_days)
            
            # Evidence count depends on case type
            evidence_count = max(1, int(np.random.normal(
                self._expected_evidence_count(case_type), 3
            )))
            
            # Task metrics
            total_tasks = max(3, int(np.random.normal(
                self._expected_task_count(case_type, priority), 5
            )))
            completed_tasks = int(total_tasks * self._completion_rate(status))
            overdue_tasks = max(0, int(np.random.normal(1 if is_anomaly else 0, 1)))
            
            # Outcome prediction features
            conviction_probability = self._calculate_conviction_prob(
                case_type, priority, evidence_count, duration_days, is_anomaly
            )
            
            # Resource allocation
            assigned_investigators = self._assign_investigators(priority, case_type)
            forensic_hours = max(0, int(np.random.normal(
                evidence_count * 2, evidence_count * 0.5
            )))
            
            # Financial impact (for fraud, ransomware, etc.)
            financial_impact = self._calculate_financial_impact(case_type)
            
            case = {
                'case_id': f'CASE-{case_id:06d}',
                'case_type': case_type,
                'priority': priority,
                'status': status,
                'created_date': created_date.strftime('%Y-%m-%d'),
                'duration_days': duration_days,
                'evidence_count': evidence_count,
                'total_tasks': total_tasks,
                'completed_tasks': completed_tasks,
                'overdue_tasks': overdue_tasks,
                'assigned_investigators': assigned_investigators,
                'forensic_hours': forensic_hours,
                'financial_impact_usd': financial_impact,
                'conviction_probability': round(conviction_probability, 3),
                'is_anomaly': is_anomaly,
                'victim_count': max(1, int(np.random.lognormal(0, 1))),
                'suspect_count': max(0, int(np.random.poisson(1.2))),
                'jurisdiction': random.choice(['LOCAL', 'REGIONAL', 'NATIONAL', 'INTERNATIONAL']),
                'requires_international_cooperation': case_type in ['TERRORISM', 'RANSOMWARE'] and random.random() > 0.5,
            }
            
            cases.append(case)
        
        return pd.DataFrame(cases)
    
    def generate_evidence_dataset(self):
        """Generate evidence-related data for chain of custody analysis"""
        evidence_records = []
        
        for ev_id in range(1, self.n_evidence + 1):
            case_id = f'CASE-{random.randint(1, self.n_cases):06d}'
            evidence_type = random.choice(self.evidence_types)
            
            # Collection timestamp
            collected_date = datetime(2020, 1, 1) + timedelta(
                days=random.randint(0, 1800),
                hours=random.randint(0, 23),
                minutes=random.randint(0, 59)
            )
            
            # Chain of custody integrity (for anomaly detection)
            custody_transfers = random.randint(1, 8)
            is_chain_broken = random.random() < 0.02  # 2% broken chains
            
            if is_chain_broken:
                custody_transfers = random.randint(8, 20)
                integrity_score = random.uniform(0.3, 0.7)
            else:
                integrity_score = random.uniform(0.85, 1.0)
            
            # File properties (for digital evidence)
            file_size_mb = 0
            hash_verified = False
            if evidence_type in ['DIGITAL_DEVICE', 'FORENSIC_IMAGE', 'MALWARE_SAMPLE']:
                file_size_mb = max(1, int(np.random.lognormal(5, 2)))
                hash_verified = random.random() > 0.01
            
            # Processing status
            processed = random.random() > 0.15
            days_to_process = max(1, int(np.random.exponential(5)))
            
            evidence = {
                'evidence_id': f'EV-{ev_id:07d}',
                'case_id': case_id,
                'evidence_type': evidence_type,
                'collected_date': collected_date.strftime('%Y-%m-%d %H:%M:%S'),
                'custody_transfers': custody_transfers,
                'integrity_score': round(integrity_score, 3),
                'is_chain_broken': is_chain_broken,
                'file_size_mb': file_size_mb,
                'hash_verified': hash_verified,
                'processed': processed,
                'days_to_process': days_to_process if processed else None,
                'storage_location': random.choice(['EVIDENCE_ROOM_A', 'EVIDENCE_ROOM_B', 'DIGITAL_VAULT', 'OFFSITE_SECURE']),
                'access_count': random.randint(1, 15),
                'criticality': random.choice(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']),
            }
            
            evidence_records.append(evidence)
        
        return pd.DataFrame(evidence_records)
    
    def generate_task_dataset(self):
        """Generate task management data for workload prediction"""
        tasks = []
        
        task_types = [
            'EVIDENCE_COLLECTION', 'FORENSIC_ANALYSIS', 'WITNESS_INTERVIEW',
            'LEGAL_REVIEW', 'REPORT_GENERATION', 'SUSPECT_INTERROGATION',
            'DATA_ANALYSIS', 'COURT_PREPARATION', 'CASE_DOCUMENTATION'
        ]
        
        for task_id in range(1, self.n_tasks + 1):
            case_id = f'CASE-{random.randint(1, self.n_cases):06d}'
            task_type = random.choice(task_types)
            assigned_role = random.choice(self.user_roles)
            
            created_date = datetime(2020, 1, 1) + timedelta(
                days=random.randint(0, 1800)
            )
            
            # Task duration estimation
            estimated_hours = max(1, int(np.random.lognormal(2, 0.8)))
            actual_hours = max(1, int(np.random.normal(estimated_hours, estimated_hours * 0.4)))
            
            # SLA compliance
            sla_hours = estimated_hours * 1.5
            is_overdue = random.random() < 0.1
            if is_overdue:
                actual_hours = int(sla_hours * random.uniform(1.2, 3.0))
            
            status = random.choices(
                ['PENDING', 'IN_PROGRESS', 'COMPLETED', 'OVERDUE'],
                weights=[0.15, 0.25, 0.50, 0.10]
            )[0]
            
            task = {
                'task_id': f'TASK-{task_id:07d}',
                'case_id': case_id,
                'task_type': task_type,
                'assigned_role': assigned_role,
                'created_date': created_date.strftime('%Y-%m-%d'),
                'estimated_hours': estimated_hours,
                'actual_hours': actual_hours if status == 'COMPLETED' else None,
                'sla_hours': sla_hours,
                'status': status,
                'is_overdue': is_overdue,
                'priority': random.choice(self.case_priorities),
                'complexity': random.choice(['SIMPLE', 'MODERATE', 'COMPLEX', 'VERY_COMPLEX']),
                'requires_specialist': random.random() > 0.7,
            }
            
            tasks.append(task)
        
        return pd.DataFrame(tasks)
    
    def generate_time_series_dataset(self):
        """Generate time-series data for trend analysis and forecasting"""
        date_range = pd.date_range(start='2020-01-01', end='2025-10-01', freq='D')
        time_series = []
        
        for date in date_range:
            # Seasonal patterns (more cases during certain months)
            seasonal_factor = 1 + 0.3 * np.sin(2 * np.pi * date.dayofyear / 365)
            
            # Weekly patterns (fewer reports on weekends)
            weekly_factor = 0.6 if date.weekday() >= 5 else 1.0
            
            # Base case count with trend
            days_since_start = (date - date_range[0]).days
            base_cases = 10 + 0.005 * days_since_start  # Growing trend
            
            # Daily cases with noise
            daily_cases = max(0, int(np.random.poisson(
                base_cases * seasonal_factor * weekly_factor
            )))
            
            # Anomalous spikes (e.g., major data breaches)
            if random.random() < 0.01:
                daily_cases = int(daily_cases * random.uniform(3, 8))
            
            record = {
                'date': date.strftime('%Y-%m-%d'),
                'day_of_week': date.strftime('%A'),
                'month': date.month,
                'year': date.year,
                'daily_cases': daily_cases,
                'daily_evidence_items': int(daily_cases * random.uniform(2, 4)),
                'daily_tasks_created': int(daily_cases * random.uniform(3, 6)),
                'active_investigators': random.randint(20, 50),
                'avg_case_duration_days': max(10, int(np.random.normal(45, 10))),
            }
            
            time_series.append(record)
        
        return pd.DataFrame(time_series)
    
    # Helper methods
    def _get_base_duration(self, case_type, priority):
        """Estimate base case duration"""
        duration_map = {
            'CYBERBULLYING': 30, 'FRAUD': 60, 'HACKING': 90,
            'IDENTITY_THEFT': 45, 'ONLINE_SCAM': 40, 'DATA_BREACH': 120,
            'RANSOMWARE': 90, 'PHISHING': 35, 'CHILD_EXPLOITATION': 180,
            'TERRORISM': 240
        }
        base = duration_map.get(case_type, 60)
        
        priority_multipliers = {'LOW': 1.5, 'MEDIUM': 1.0, 'HIGH': 0.8, 'CRITICAL': 0.6}
        return int(base * priority_multipliers[priority])
    
    def _determine_status(self, created_date, duration_days):
        """Determine case status based on creation date and duration"""
        completion_date = created_date + timedelta(days=duration_days)
        today = datetime.now()
        
        if completion_date > today:
            statuses = ['REPORTED', 'UNDER_INVESTIGATION', 'EVIDENCE_COLLECTION', 'ANALYSIS']
            return random.choice(statuses)
        else:
            statuses = [
                'PROSECUTION_PENDING', 'CLOSED_CONVICTED',
                'CLOSED_DISMISSED', 'CLOSED_NO_EVIDENCE'
            ]
            weights = [0.15, 0.45, 0.25, 0.15]
            return np.random.choice(statuses, p=weights)
    
    def _expected_evidence_count(self, case_type):
        """Expected evidence items per case type"""
        evidence_map = {
            'CYBERBULLYING': 5, 'FRAUD': 12, 'HACKING': 15,
            'IDENTITY_THEFT': 8, 'ONLINE_SCAM': 7, 'DATA_BREACH': 20,
            'RANSOMWARE': 18, 'PHISHING': 6, 'CHILD_EXPLOITATION': 25,
            'TERRORISM': 30
        }
        return evidence_map.get(case_type, 10)
    
    def _expected_task_count(self, case_type, priority):
        """Expected task count"""
        base_tasks = {
            'CYBERBULLYING': 8, 'FRAUD': 15, 'HACKING': 18,
            'IDENTITY_THEFT': 12, 'ONLINE_SCAM': 10, 'DATA_BREACH': 25,
            'RANSOMWARE': 22, 'PHISHING': 9, 'CHILD_EXPLOITATION': 35,
            'TERRORISM': 40
        }
        priority_multiplier = {'LOW': 0.8, 'MEDIUM': 1.0, 'HIGH': 1.2, 'CRITICAL': 1.5}
        return int(base_tasks.get(case_type, 15) * priority_multiplier[priority])
    
    def _completion_rate(self, status):
        """Task completion rate by status"""
        rates = {
            'REPORTED': 0.1, 'UNDER_INVESTIGATION': 0.4,
            'EVIDENCE_COLLECTION': 0.5, 'ANALYSIS': 0.7,
            'PROSECUTION_PENDING': 0.9, 'CLOSED_CONVICTED': 1.0,
            'CLOSED_DISMISSED': 1.0, 'CLOSED_NO_EVIDENCE': 1.0
        }
        return rates.get(status, 0.5)
    
    def _calculate_conviction_prob(self, case_type, priority, evidence_count, duration, is_anomaly):
        """Estimate conviction probability"""
        base_prob = {
            'CYBERBULLYING': 0.35, 'FRAUD': 0.55, 'HACKING': 0.50,
            'IDENTITY_THEFT': 0.45, 'ONLINE_SCAM': 0.40, 'DATA_BREACH': 0.65,
            'RANSOMWARE': 0.60, 'PHISHING': 0.45, 'CHILD_EXPLOITATION': 0.75,
            'TERRORISM': 0.70
        }
        
        prob = base_prob.get(case_type, 0.5)
        prob += (evidence_count - 10) * 0.02  # More evidence helps
        prob += (priority == 'CRITICAL') * 0.1  # Critical cases get more resources
        prob -= (duration > 180) * 0.15  # Long cases lose momentum
        prob -= is_anomaly * 0.2  # Anomalies indicate problems
        
        return max(0.1, min(0.95, prob))
    
    def _assign_investigators(self, priority, case_type):
        """Assign investigator count"""
        base = {'LOW': 1, 'MEDIUM': 2, 'HIGH': 3, 'CRITICAL': 5}
        count = base[priority]
        if case_type in ['TERRORISM', 'CHILD_EXPLOITATION']:
            count += 2
        return count
    
    def _calculate_financial_impact(self, case_type):
        """Calculate financial impact for applicable cases"""
        if case_type in ['FRAUD', 'RANSOMWARE', 'ONLINE_SCAM', 'DATA_BREACH']:
            return max(100, int(np.random.lognormal(9, 2)))
        return 0


def main():
    """Generate all datasets"""
    print("Generating JCTC ML Training Datasets...")
    print("=" * 60)
    
    generator = JCTCDatasetGenerator(n_cases=5000, n_evidence=15000, n_tasks=20000)
    
    # Create output directory
    output_dir = Path('tests/ml_datasets')
    output_dir.mkdir(parents=True, exist_ok=True)
    
    # Generate datasets
    print("\n1. Generating Cases Dataset...")
    cases_df = generator.generate_cases_dataset()
    cases_df.to_csv(output_dir / 'cases_dataset.csv', index=False)
    print(f"   ✓ Generated {len(cases_df)} case records")
    print(f"   ✓ Saved to: {output_dir / 'cases_dataset.csv'}")
    
    print("\n2. Generating Evidence Dataset...")
    evidence_df = generator.generate_evidence_dataset()
    evidence_df.to_csv(output_dir / 'evidence_dataset.csv', index=False)
    print(f"   ✓ Generated {len(evidence_df)} evidence records")
    print(f"   ✓ Saved to: {output_dir / 'evidence_dataset.csv'}")
    
    print("\n3. Generating Task Dataset...")
    tasks_df = generator.generate_task_dataset()
    tasks_df.to_csv(output_dir / 'tasks_dataset.csv', index=False)
    print(f"   ✓ Generated {len(tasks_df)} task records")
    print(f"   ✓ Saved to: {output_dir / 'tasks_dataset.csv'}")
    
    print("\n4. Generating Time Series Dataset...")
    ts_df = generator.generate_time_series_dataset()
    ts_df.to_csv(output_dir / 'time_series_dataset.csv', index=False)
    print(f"   ✓ Generated {len(ts_df)} daily records")
    print(f"   ✓ Saved to: {output_dir / 'time_series_dataset.csv'}")
    
    # Generate metadata
    print("\n5. Generating Dataset Metadata...")
    metadata = {
        'generated_date': datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
        'datasets': {
            'cases': {
                'file': 'cases_dataset.csv',
                'records': len(cases_df),
                'features': list(cases_df.columns),
                'use_cases': [
                    'Classification: Predict case outcome (conviction probability)',
                    'Classification: Predict case priority',
                    'Anomaly Detection: Identify unusual case patterns',
                    'Prediction: Estimate case duration'
                ]
            },
            'evidence': {
                'file': 'evidence_dataset.csv',
                'records': len(evidence_df),
                'features': list(evidence_df.columns),
                'use_cases': [
                    'Anomaly Detection: Detect broken chain of custody',
                    'Classification: Predict evidence processing time',
                    'Classification: Identify critical evidence'
                ]
            },
            'tasks': {
                'file': 'tasks_dataset.csv',
                'records': len(tasks_df),
                'features': list(tasks_df.columns),
                'use_cases': [
                    'Prediction: Estimate task completion time',
                    'Classification: Predict if task will be overdue',
                    'Anomaly Detection: Identify resource bottlenecks'
                ]
            },
            'time_series': {
                'file': 'time_series_dataset.csv',
                'records': len(ts_df),
                'features': list(ts_df.columns),
                'use_cases': [
                    'Forecasting: Predict future case volumes',
                    'Anomaly Detection: Detect unusual spikes in cases',
                    'Trend Analysis: Identify seasonal patterns'
                ]
            }
        }
    }
    
    with open(output_dir / 'dataset_metadata.json', 'w') as f:
        json.dump(metadata, f, indent=2)
    print(f"   ✓ Saved metadata to: {output_dir / 'dataset_metadata.json'}")
    
    # Summary statistics
    print("\n" + "=" * 60)
    print("DATASET SUMMARY")
    print("=" * 60)
    print(f"\nTotal Records Generated: {len(cases_df) + len(evidence_df) + len(tasks_df) + len(ts_df):,}")
    print(f"\nDatasets created in: {output_dir.absolute()}")
    print("\nML Use Cases:")
    print("  • Classification: Case outcomes, priorities, evidence types")
    print("  • Anomaly Detection: Unusual patterns, chain breaks, spikes")
    print("  • Prediction: Durations, resource needs, conviction probability")
    print("  • Forecasting: Case volumes, workload trends")
    print("\n" + "=" * 60)


if __name__ == '__main__':
    main()
