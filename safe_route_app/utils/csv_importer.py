"""
CSV upload handler for crime data.
Allows users to upload real crime data from government sources or other datasets.
"""
import csv
from datetime import datetime
from ..models import CrimePoint


class CSVCrimeDataImporter:
    """
    Import crime data from CSV files.
    """
    
    # Expected CSV columns (flexible mapping)
    COLUMN_MAPPINGS = {
        'latitude': ['latitude', 'lat', 'y', 'y_coord'],
        'longitude': ['longitude', 'lon', 'lng', 'long', 'x', 'x_coord'],
        'crime_type': ['crime_type', 'type', 'offense', 'crime', 'category'],
        'date': ['date', 'occurred_date', 'incident_date', 'datetime', 'timestamp'],
        'severity': ['severity', 'level', 'priority'],
        'description': ['description', 'desc', 'details', 'narrative'],
    }
    
    # Crime type normalization
    CRIME_TYPE_MAPPING = {
        'theft': ['theft', 'larceny', 'stealing', 'burglary'],
        'assault': ['assault', 'battery', 'attack', 'violence'],
        'robbery': ['robbery', 'mugging', 'armed robbery'],
        'harassment': ['harassment', 'stalking', 'intimidation'],
        'vandalism': ['vandalism', 'property damage', 'graffiti'],
        'burglary': ['burglary', 'breaking and entering', 'break-in'],
    }
    
    def __init__(self):
        self.errors = []
        self.imported_count = 0
        self.skipped_count = 0
    
    def import_from_csv(self, csv_file, clear_existing=False):
        """
        Import crime data from CSV file.
        
        Args:
            csv_file: File object or path to CSV
            clear_existing: Whether to clear existing non-sample data
            
        Returns:
            dict with import statistics
        """
        self.errors = []
        self.imported_count = 0
        self.skipped_count = 0
        
        if clear_existing:
            CrimePoint.objects.filter(is_sample_data=False).delete()
        
        try:
            # Read CSV
            csv_content = csv_file.read().decode('utf-8').splitlines()
            reader = csv.DictReader(csv_content)
            
            # Detect column mappings
            column_map = self._detect_columns(reader.fieldnames)
            
            if not column_map.get('latitude') or not column_map.get('longitude'):
                return {
                    'success': False,
                    'error': 'CSV must contain latitude and longitude columns',
                    'imported': 0,
                    'skipped': 0
                }
            
            # Process rows
            for row_num, row in enumerate(reader, start=2):
                try:
                    self._import_row(row, column_map)
                    self.imported_count += 1
                except Exception as e:
                    self.skipped_count += 1
                    self.errors.append(f"Row {row_num}: {str(e)}")
            
            return {
                'success': True,
                'imported': self.imported_count,
                'skipped': self.skipped_count,
                'errors': self.errors[:10],  # Return first 10 errors
                'message': f'Successfully imported {self.imported_count} crime records'
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': f'Failed to process CSV: {str(e)}',
                'imported': self.imported_count,
                'skipped': self.skipped_count
            }
    
    def _detect_columns(self, fieldnames):
        """Detect which columns map to our required fields."""
        column_map = {}
        
        fieldnames_lower = [f.lower().strip() for f in fieldnames]
        
        for our_field, possible_names in self.COLUMN_MAPPINGS.items():
            for possible_name in possible_names:
                if possible_name in fieldnames_lower:
                    # Get original fieldname (with correct case)
                    original_name = fieldnames[fieldnames_lower.index(possible_name)]
                    column_map[our_field] = original_name
                    break
        
        return column_map
    
    def _import_row(self, row, column_map):
        """Import a single row from CSV."""
        # Extract coordinates
        lat = float(row[column_map['latitude']])
        lon = float(row[column_map['longitude']])
        
        # Validate coordinates
        if not (-90 <= lat <= 90) or not (-180 <= lon <= 180):
            raise ValueError(f"Invalid coordinates: {lat}, {lon}")
        
        # Extract crime type
        crime_type = 'other'
        if 'crime_type' in column_map:
            raw_type = row[column_map['crime_type']].lower().strip()
            crime_type = self._normalize_crime_type(raw_type)
        
        # Extract date
        occurred_at = datetime.now()
        if 'date' in column_map:
            date_str = row[column_map['date']]
            occurred_at = self._parse_date(date_str)
        
        # Extract severity
        severity = 2  # Default to medium
        if 'severity' in column_map:
            try:
                severity = int(row[column_map['severity']])
                severity = max(1, min(4, severity))  # Clamp to 1-4
            except:
                pass
        
        # Extract description
        description = ''
        if 'description' in column_map:
            description = row[column_map['description']][:500]  # Limit length
        
        # Create crime point
        CrimePoint.objects.create(
            latitude=lat,
            longitude=lon,
            crime_type=crime_type,
            severity=severity,
            description=description,
            occurred_at=occurred_at,
            is_sample_data=False,
            source='csv_upload'
        )
    
    def _normalize_crime_type(self, raw_type):
        """Normalize crime type to our standard categories."""
        raw_type = raw_type.lower().strip()
        
        for our_type, variations in self.CRIME_TYPE_MAPPING.items():
            for variation in variations:
                if variation in raw_type:
                    return our_type
        
        return 'other'
    
    def _parse_date(self, date_str):
        """Parse date string in various formats."""
        date_formats = [
            '%Y-%m-%d',
            '%m/%d/%Y',
            '%d/%m/%Y',
            '%Y-%m-%d %H:%M:%S',
            '%m/%d/%Y %H:%M:%S',
            '%Y-%m-%dT%H:%M:%S',
        ]
        
        for fmt in date_formats:
            try:
                return datetime.strptime(date_str, fmt)
            except:
                continue
        
        # If all parsing fails, return current time
        return datetime.now()


def import_crime_csv(csv_file, clear_existing=False):
    """
    Convenience function to import crime data from CSV.
    
    Args:
        csv_file: File object
        clear_existing: Whether to clear existing data
        
    Returns:
        dict with import results
    """
    importer = CSVCrimeDataImporter()
    return importer.import_from_csv(csv_file, clear_existing)
