import { University } from '@/types/university';

export const universities: University[] = [
  {
    id: '1',
    name: 'National University of Sciences',
    location: 'Islamabad, Pakistan',
    logo: '🏛️',
    fields: ['Computer Science', 'Engineering', 'Business', 'Medicine'],
    minPercentage: 85,
    maxFee: 500000,
    ranking: 1,
    type: 'public',
    features: ['Research Focused', 'Industry Partnerships', 'Modern Campus']
  },
  {
    id: '2',
    name: 'Lahore Institute of Technology',
    location: 'Lahore, Pakistan',
    logo: '🎓',
    fields: ['Computer Science', 'Engineering', 'Design', 'Arts'],
    minPercentage: 75,
    maxFee: 350000,
    ranking: 5,
    type: 'private',
    features: ['Creative Programs', 'International Faculty', 'Internship Support']
  },
  {
    id: '3',
    name: 'Karachi Business School',
    location: 'Karachi, Pakistan',
    logo: '📊',
    fields: ['Business', 'Economics', 'Finance', 'Marketing'],
    minPercentage: 70,
    maxFee: 600000,
    ranking: 3,
    type: 'private',
    features: ['Business Network', 'Case Study Method', 'Global Exchange']
  },
  {
    id: '4',
    name: 'Punjab Medical College',
    location: 'Faisalabad, Pakistan',
    logo: '⚕️',
    fields: ['Medicine', 'Pharmacy', 'Nursing', 'Dentistry'],
    minPercentage: 90,
    maxFee: 800000,
    ranking: 2,
    type: 'public',
    features: ['Teaching Hospital', 'Research Labs', 'Clinical Training']
  },
  {
    id: '5',
    name: 'Federal Arts University',
    location: 'Rawalpindi, Pakistan',
    logo: '🎨',
    fields: ['Arts', 'Design', 'Media', 'Communication'],
    minPercentage: 60,
    maxFee: 250000,
    ranking: 8,
    type: 'public',
    features: ['Creative Studios', 'Exhibition Spaces', 'Industry Projects']
  },
  {
    id: '6',
    name: 'Peshawar Engineering Institute',
    location: 'Peshawar, Pakistan',
    logo: '⚙️',
    fields: ['Engineering', 'Computer Science', 'Architecture'],
    minPercentage: 80,
    maxFee: 300000,
    ranking: 6,
    type: 'public',
    features: ['Hands-on Labs', 'Industry Visits', 'Scholarship Programs']
  },
  {
    id: '7',
    name: 'Multan Agricultural University',
    location: 'Multan, Pakistan',
    logo: '🌾',
    fields: ['Agriculture', 'Environmental Science', 'Biology'],
    minPercentage: 55,
    maxFee: 150000,
    ranking: 10,
    type: 'public',
    features: ['Research Farms', 'Field Work', 'Government Jobs']
  },
  {
    id: '8',
    name: 'Quetta Law College',
    location: 'Quetta, Pakistan',
    logo: '⚖️',
    fields: ['Law', 'Political Science', 'International Relations'],
    minPercentage: 65,
    maxFee: 200000,
    ranking: 12,
    type: 'public',
    features: ['Moot Courts', 'Legal Aid Clinics', 'Bar Preparation']
  }
];

export const fieldOptions = [
  'Computer Science',
  'Engineering',
  'Business',
  'Medicine',
  'Law',
  'Arts',
  'Design',
  'Economics',
  'Finance',
  'Marketing',
  'Pharmacy',
  'Nursing',
  'Dentistry',
  'Media',
  'Communication',
  'Architecture',
  'Agriculture',
  'Environmental Science',
  'Biology',
  'Political Science',
  'International Relations'
];
