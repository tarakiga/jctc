"""
Entity Resolution Dataset Generator for JCTC Case Management System

Generates datasets for entity resolution tasks:
1. Linking suspects across multiple cases (repeat offenders)
2. Identifying victim patterns (targeted individuals)
3. Matching devices and digital footprints
4. Detecting criminal networks and relationships

This simulates real-world challenges:
- Name variations and typos
- Partial matches
- Similar but distinct entities
- Network relationships
"""

import pandas as pd
import numpy as np
import random
import json
from datetime import datetime, timedelta
from pathlib import Path


# Seed for reproducibility
np.random.seed(42)
random.seed(42)


class EntityResolutionDatasetGenerator:
    """Generate entity resolution training data"""
    
    def __init__(self, n_unique_entities=1000, n_records=5000):
        self.n_unique_entities = n_unique_entities
        self.n_records = n_records
        
        # Name components for generating realistic variations
        self.first_names = [
            'John', 'Jane', 'Michael', 'Sarah', 'David', 'Emily', 'James',
            'Maria', 'Robert', 'Lisa', 'William', 'Jennifer', 'Richard',
            'Patricia', 'Thomas', 'Linda', 'Charles', 'Barbara', 'Daniel',
            'Susan', 'Matthew', 'Jessica', 'Anthony', 'Karen', 'Mark',
            'Nancy', 'Donald', 'Betty', 'Steven', 'Helen', 'Paul', 'Sandra',
            'Andrew', 'Ashley', 'Joshua', 'Kimberly', 'Kenneth', 'Donna',
            'Kevin', 'Carol', 'Brian', 'Michelle', 'George', 'Amanda',
            'Edward', 'Melissa', 'Ronald', 'Deborah', 'Timothy', 'Stephanie'
        ]
        
        self.last_names = [
            'Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia',
            'Miller', 'Davis', 'Rodriguez', 'Martinez', 'Hernandez',
            'Lopez', 'Gonzalez', 'Wilson', 'Anderson', 'Thomas', 'Taylor',
            'Moore', 'Jackson', 'Martin', 'Lee', 'Perez', 'Thompson',
            'White', 'Harris', 'Sanchez', 'Clark', 'Ramirez', 'Lewis',
            'Robinson', 'Walker', 'Young', 'Allen', 'King', 'Wright',
            'Scott', 'Torres', 'Nguyen', 'Hill', 'Flores', 'Green',
            'Adams', 'Nelson', 'Baker', 'Hall', 'Rivera', 'Campbell',
            'Mitchell', 'Carter', 'Roberts'
        ]
        
        self.entity_types = ['SUSPECT', 'VICTIM', 'WITNESS', 'ASSOCIATE']
        
    def generate_master_entities(self):
        """Generate master entity records (ground truth)"""
        entities = []
        
        for entity_id in range(1, self.n_unique_entities + 1):
            first_name = random.choice(self.first_names)
            last_name = random.choice(self.last_names)
            
            # Generate realistic attributes
            entity = {
                'entity_id': f'ENT-{entity_id:05d}',
                'canonical_name': f'{first_name} {last_name}',
                'first_name': first_name,
                'last_name': last_name,
                'date_of_birth': self._generate_dob(),
                'email': f'{first_name.lower()}.{last_name.lower()}{random.randint(1,999)}@example.com',
                'phone': self._generate_phone(),
                'national_id': f'{random.randint(100000000, 999999999)}',
                'address_street': f'{random.randint(1, 9999)} {random.choice(["Main", "Oak", "Elm", "Maple", "Pine"])} St',
                'address_city': random.choice(['New York', 'Los Angeles', 'Chicago', 'Houston', 'Phoenix', 'Philadelphia']),
                'ip_address': f'{random.randint(1,255)}.{random.randint(1,255)}.{random.randint(1,255)}.{random.randint(1,255)}',
                'device_id': f'DEV-{random.randint(100000, 999999)}',
                'entity_type': random.choice(self.entity_types),
                'is_repeat_offender': random.random() < 0.15,  # 15% are repeat offenders
                'case_count': 0  # Will be updated later
            }
            
            entities.append(entity)
        
        return pd.DataFrame(entities)
    
    def generate_entity_mentions(self, master_entities):
        """Generate entity mentions with variations (the records to match)"""
        mentions = []
        
        # Track which entities appear in multiple cases
        entity_case_map = {}
        
        for _ in range(self.n_records):
            # Select a master entity (some entities appear more frequently)
            # Repeat offenders appear in multiple cases
            entity_idx = self._select_entity_with_bias(len(master_entities))
            entity = master_entities.iloc[entity_idx]
            
            # Track case appearances
            if entity['entity_id'] not in entity_case_map:
                entity_case_map[entity['entity_id']] = []
            
            case_id = f'CASE-{random.randint(1, 5000):06d}'
            entity_case_map[entity['entity_id']].append(case_id)
            
            # Generate mention with variations/noise
            mention = {
                'mention_id': f'MENTION-{len(mentions)+1:06d}',
                'entity_id': entity['entity_id'],  # Ground truth for evaluation
                'case_id': case_id,
                'entity_type': entity['entity_type'],
                'mention_date': (datetime(2020, 1, 1) + timedelta(days=random.randint(0, 1800))).strftime('%Y-%m-%d'),
                
                # Name with variations
                'name': self._add_name_variations(entity['canonical_name']),
                'first_name': self._add_name_variations(entity['first_name']),
                'last_name': self._add_name_variations(entity['last_name']),
                
                # Attributes with noise/variations
                'date_of_birth': self._add_dob_variations(entity['date_of_birth']),
                'email': self._add_email_variations(entity['email']),
                'phone': self._add_phone_variations(entity['phone']),
                'national_id': self._add_id_variations(entity['national_id']),
                'address_street': self._add_address_variations(entity['address_street']),
                'address_city': entity['address_city'] if random.random() > 0.1 else '',
                'ip_address': self._add_ip_variations(entity['ip_address']),
                'device_id': self._add_device_variations(entity['device_id']),
                
                # Data quality indicators
                'data_completeness': random.uniform(0.4, 1.0),
                'source': random.choice(['POLICE_REPORT', 'WITNESS_STATEMENT', 'DIGITAL_EVIDENCE', 'THIRD_PARTY', 'CONFESSION']),
            }
            
            mentions.append(mention)
        
        # Update case counts
        for entity_id, cases in entity_case_map.items():
            master_entities.loc[master_entities['entity_id'] == entity_id, 'case_count'] = len(set(cases))
        
        return pd.DataFrame(mentions)
    
    def generate_pairwise_matches(self, mentions):
        """Generate pairwise comparisons for training"""
        pairs = []
        
        # Create positive pairs (same entity)
        entity_groups = mentions.groupby('entity_id')
        for entity_id, group in entity_groups:
            if len(group) > 1:
                # Sample pairs from the same entity
                for _ in range(min(5, len(group))):
                    idx1, idx2 = random.sample(range(len(group)), 2)
                    mention1 = group.iloc[idx1]
                    mention2 = group.iloc[idx2]
                    
                    pair = self._create_pair_features(mention1, mention2, is_match=True)
                    pairs.append(pair)
        
        # Create negative pairs (different entities)
        for _ in range(len(pairs) * 2):  # 2x negative samples
            idx1, idx2 = random.sample(range(len(mentions)), 2)
            mention1 = mentions.iloc[idx1]
            mention2 = mentions.iloc[idx2]
            
            if mention1['entity_id'] != mention2['entity_id']:
                pair = self._create_pair_features(mention1, mention2, is_match=False)
                pairs.append(pair)
        
        return pd.DataFrame(pairs)
    
    def generate_network_relationships(self, master_entities, mentions):
        """Generate network relationships between entities"""
        relationships = []
        
        # Group mentions by case to find co-occurrences
        case_groups = mentions.groupby('case_id')
        
        for case_id, group in case_groups:
            entities_in_case = group['entity_id'].unique()
            
            if len(entities_in_case) > 1:
                # Create relationships between entities in the same case
                for i, entity1 in enumerate(entities_in_case):
                    for entity2 in entities_in_case[i+1:]:
                        
                        type1 = master_entities[master_entities['entity_id'] == entity1]['entity_type'].values[0]
                        type2 = master_entities[master_entities['entity_id'] == entity2]['entity_type'].values[0]
                        
                        # Determine relationship type
                        rel_type = self._determine_relationship_type(type1, type2)
                        
                        relationship = {
                            'relationship_id': f'REL-{len(relationships)+1:06d}',
                            'entity1_id': entity1,
                            'entity2_id': entity2,
                            'case_id': case_id,
                            'relationship_type': rel_type,
                            'strength': random.uniform(0.3, 1.0),
                            'first_seen': group['mention_date'].min(),
                            'last_seen': group['mention_date'].max(),
                            'interaction_count': random.randint(1, 20),
                        }
                        
                        relationships.append(relationship)
        
        return pd.DataFrame(relationships)
    
    # Helper methods for variations
    def _generate_dob(self):
        """Generate random date of birth"""
        year = random.randint(1950, 2005)
        month = random.randint(1, 12)
        day = random.randint(1, 28)
        return f'{year}-{month:02d}-{day:02d}'
    
    def _generate_phone(self):
        """Generate random phone number"""
        return f'+1-{random.randint(200, 999)}-{random.randint(200, 999)}-{random.randint(1000, 9999)}'
    
    def _select_entity_with_bias(self, n_entities):
        """Select entity with power-law bias (some entities appear more often)"""
        # Use zipf distribution to simulate repeat offenders
        return min(n_entities - 1, int(np.random.zipf(1.5) - 1))
    
    def _add_name_variations(self, name):
        """Add realistic name variations"""
        if not name or random.random() > 0.7:  # 30% get variations
            return name
        
        variations = [
            name,  # Original
            name.upper(),  # JOHN SMITH
            name.lower(),  # john smith
            name.replace(' ', ''),  # JohnSmith
            self._add_typo(name),  # Typo
            name.split()[0] if ' ' in name else name,  # First name only
        ]
        
        return random.choice(variations)
    
    def _add_typo(self, text):
        """Add a random typo"""
        if len(text) < 3 or random.random() > 0.5:
            return text
        
        text_list = list(text)
        idx = random.randint(0, len(text_list) - 1)
        
        # Random typo type
        typo_type = random.choice(['delete', 'substitute', 'transpose'])
        
        if typo_type == 'delete' and len(text_list) > 1:
            text_list.pop(idx)
        elif typo_type == 'substitute':
            text_list[idx] = random.choice('abcdefghijklmnopqrstuvwxyz')
        elif typo_type == 'transpose' and idx < len(text_list) - 1:
            text_list[idx], text_list[idx+1] = text_list[idx+1], text_list[idx]
        
        return ''.join(text_list)
    
    def _add_dob_variations(self, dob):
        """Add date of birth variations"""
        if random.random() > 0.2:  # 20% missing/wrong
            return dob
        
        if random.random() < 0.5:
            return ''  # Missing
        
        # Parse and modify
        parts = dob.split('-')
        if random.random() < 0.5:
            parts[2] = f'{int(parts[2]) + random.randint(-2, 2):02d}'  # Day off by a bit
        return '-'.join(parts)
    
    def _add_email_variations(self, email):
        """Add email variations"""
        if random.random() > 0.3:  # 30% missing/variations
            return email
        
        if random.random() < 0.3:
            return ''  # Missing
        
        return self._add_typo(email)
    
    def _add_phone_variations(self, phone):
        """Add phone number variations"""
        if random.random() > 0.4:  # 40% missing/variations
            return phone
        
        if random.random() < 0.3:
            return ''
        
        # Format variations
        phone_clean = phone.replace('+1-', '').replace('-', '')
        formats = [
            phone,
            phone_clean,
            f'({phone_clean[:3]}) {phone_clean[3:6]}-{phone_clean[6:]}',
            phone_clean[:3] + '-' + phone_clean[3:],
        ]
        return random.choice(formats)
    
    def _add_id_variations(self, national_id):
        """Add national ID variations"""
        if random.random() > 0.3:
            return national_id
        
        if random.random() < 0.2:
            return ''
        
        # Might have a digit wrong
        id_list = list(national_id)
        idx = random.randint(0, len(id_list) - 1)
        id_list[idx] = str(random.randint(0, 9))
        return ''.join(id_list)
    
    def _add_address_variations(self, address):
        """Add address variations"""
        if random.random() > 0.3:
            return address
        
        if random.random() < 0.2:
            return ''
        
        # Abbreviations
        address = address.replace(' Street', ' St').replace(' St', ' Street')
        address = address.replace(' Avenue', ' Ave').replace(' Ave', ' Avenue')
        return address
    
    def _add_ip_variations(self, ip):
        """Add IP address variations"""
        if random.random() > 0.5:
            return ip
        
        if random.random() < 0.3:
            return ''
        
        # Might be from same subnet
        parts = ip.split('.')
        if random.random() < 0.5:
            parts[-1] = str(random.randint(1, 255))
        return '.'.join(parts)
    
    def _add_device_variations(self, device_id):
        """Add device ID variations"""
        if random.random() > 0.4:
            return device_id
        
        return '' if random.random() < 0.3 else device_id
    
    def _create_pair_features(self, mention1, mention2, is_match):
        """Create feature vector for a pair of mentions"""
        return {
            'mention1_id': mention1['mention_id'],
            'mention2_id': mention2['mention_id'],
            'is_match': is_match,
            
            # String similarity features
            'name_exact_match': int(mention1['name'] == mention2['name']),
            'name_similarity': self._string_similarity(mention1['name'], mention2['name']),
            'first_name_similarity': self._string_similarity(mention1['first_name'], mention2['first_name']),
            'last_name_similarity': self._string_similarity(mention1['last_name'], mention2['last_name']),
            
            # Attribute matches
            'dob_match': int(mention1['date_of_birth'] == mention2['date_of_birth']),
            'email_match': int(mention1['email'] == mention2['email']),
            'phone_match': int(mention1['phone'] == mention2['phone']),
            'national_id_match': int(mention1['national_id'] == mention2['national_id']),
            'city_match': int(mention1['address_city'] == mention2['address_city']),
            'ip_similarity': self._ip_similarity(mention1['ip_address'], mention2['ip_address']),
            'device_match': int(mention1['device_id'] == mention2['device_id']),
            
            # Contextual features
            'same_case': int(mention1['case_id'] == mention2['case_id']),
            'entity_type_match': int(mention1['entity_type'] == mention2['entity_type']),
            'time_diff_days': abs((pd.to_datetime(mention1['mention_date']) - pd.to_datetime(mention2['mention_date'])).days),
            
            # Data quality
            'avg_completeness': (mention1['data_completeness'] + mention2['data_completeness']) / 2,
        }
    
    def _string_similarity(self, s1, s2):
        """Calculate Levenshtein similarity"""
        if not s1 or not s2:
            return 0.0
        
        s1, s2 = s1.lower(), s2.lower()
        if s1 == s2:
            return 1.0
        
        # Simple character overlap ratio
        set1, set2 = set(s1), set(s2)
        intersection = len(set1 & set2)
        union = len(set1 | set2)
        return intersection / union if union > 0 else 0.0
    
    def _ip_similarity(self, ip1, ip2):
        """Calculate IP address similarity"""
        if not ip1 or not ip2:
            return 0.0
        
        parts1 = ip1.split('.')
        parts2 = ip2.split('.')
        
        if len(parts1) != 4 or len(parts2) != 4:
            return 0.0
        
        matches = sum(1 for p1, p2 in zip(parts1, parts2) if p1 == p2)
        return matches / 4.0
    
    def _determine_relationship_type(self, type1, type2):
        """Determine relationship type between entities"""
        if type1 == 'SUSPECT' and type2 == 'SUSPECT':
            return random.choice(['CO_CONSPIRATOR', 'ASSOCIATE', 'COMPETITOR'])
        elif type1 == 'SUSPECT' and type2 == 'VICTIM':
            return 'PERPETRATOR_VICTIM'
        elif type1 == 'SUSPECT' and type2 == 'WITNESS':
            return 'WITNESSED_BY'
        elif type1 == 'VICTIM' and type2 == 'WITNESS':
            return 'WITNESS_TO_VICTIM'
        else:
            return 'ASSOCIATE'


def main():
    """Generate all entity resolution datasets"""
    print("Generating Entity Resolution Datasets...")
    print("=" * 70)
    
    generator = EntityResolutionDatasetGenerator(
        n_unique_entities=1000,
        n_records=5000
    )
    
    output_dir = Path('tests/ml_datasets')
    output_dir.mkdir(parents=True, exist_ok=True)
    
    # 1. Generate master entities (ground truth)
    print("\n1. Generating Master Entities (Ground Truth)...")
    master_entities = generator.generate_master_entities()
    
    # 2. Generate entity mentions with variations
    print("2. Generating Entity Mentions with Variations...")
    mentions = generator.generate_entity_mentions(master_entities)
    
    # Update master entities with case counts
    print("3. Generating Pairwise Matching Dataset...")
    pairs = generator.generate_pairwise_matches(mentions)
    
    # 4. Generate network relationships
    print("4. Generating Network Relationships...")
    relationships = generator.generate_network_relationships(master_entities, mentions)
    
    # Save datasets
    print("\n5. Saving Datasets...")
    master_entities.to_csv(output_dir / 'entity_master.csv', index=False)
    print(f"   ✓ Saved master entities: {len(master_entities)} unique entities")
    
    mentions.to_csv(output_dir / 'entity_mentions.csv', index=False)
    print(f"   ✓ Saved entity mentions: {len(mentions)} records")
    
    pairs.to_csv(output_dir / 'entity_pairs.csv', index=False)
    print(f"   ✓ Saved pairwise comparisons: {len(pairs)} pairs")
    
    relationships.to_csv(output_dir / 'entity_relationships.csv', index=False)
    print(f"   ✓ Saved relationships: {len(relationships)} connections")
    
    # Statistics
    print("\n" + "=" * 70)
    print("ENTITY RESOLUTION DATASET SUMMARY")
    print("=" * 70)
    
    print(f"\nMaster Entities: {len(master_entities):,}")
    print(f"Entity Mentions: {len(mentions):,}")
    print(f"Pairwise Comparisons: {len(pairs):,}")
    print(f"  - Positive Pairs (matches): {pairs['is_match'].sum():,}")
    print(f"  - Negative Pairs (non-matches): {(~pairs['is_match']).sum():,}")
    print(f"Network Relationships: {len(relationships):,}")
    
    print(f"\nRepeat Offenders: {master_entities['is_repeat_offender'].sum()} ({master_entities['is_repeat_offender'].mean()*100:.1f}%)")
    print(f"Entities with Multiple Cases: {(master_entities['case_count'] > 1).sum()}")
    print(f"Max Cases per Entity: {master_entities['case_count'].max()}")
    
    print("\nEntity Type Distribution:")
    print(master_entities['entity_type'].value_counts())
    
    print("\n" + "=" * 70)
    print("ENTITY RESOLUTION USE CASES")
    print("=" * 70)
    print("\n✓ Record Linkage: Match entity mentions to master records")
    print("✓ Deduplication: Identify duplicate entities across cases")
    print("✓ Network Analysis: Map criminal networks and associations")
    print("✓ Repeat Offender Detection: Identify individuals in multiple cases")
    print("✓ Blocking/Indexing: Efficient candidate pair generation")
    
    print("\n" + "=" * 70)


if __name__ == '__main__':
    main()
