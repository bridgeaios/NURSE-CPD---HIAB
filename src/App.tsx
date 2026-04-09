import { useState, useEffect } from 'react';
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  doc, 
  setDoc, 
  updateDoc, 
  getDoc, 
  Timestamp, 
  getDocFromServer,
  orderBy,
  FirestoreError
} from 'firebase/firestore';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth, db, signIn, logOut } from './firebase';
import { UserProfile, Webinar, Registration, QuizQuestion } from './types';
import { cn, formatDuration } from './lib/utils';
import { generateCertificate } from './lib/certificate';

// --- Firestore Error Handling ---
enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}
import { 
  LayoutDashboard, 
  Video, 
  Award, 
  LogOut, 
  CheckCircle, 
  Clock, 
  FileText, 
  ChevronRight, 
  Play, 
  Download,
  AlertCircle,
  User as UserIcon,
  ShieldCheck,
  Plus,
  Trash2,
  Edit3,
  CreditCard,
  Lock,
  Star,
  Search,
  LayoutGrid,
  List,
  Calendar
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { format } from 'date-fns';

// --- Error Boundary Component ---
const ErrorBoundary = ({ error, onRetry }: { error: string; onRetry: () => void }) => (
  <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
    <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center border border-red-100">
      <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
        <AlertCircle className="w-8 h-8 text-red-600" />
      </div>
      <h2 className="text-2xl font-bold text-gray-900 mb-2">Something went wrong</h2>
      <p className="text-gray-600 mb-8">{error}</p>
      <button 
        onClick={onRetry}
        className="w-full py-3 bg-red-600 text-white rounded-xl font-semibold hover:bg-red-700 transition-colors"
      >
        Try Again
      </button>
    </div>
  </div>
);

// --- Login Component ---
const Login = () => (
  <div className="min-h-screen flex flex-col items-center justify-center bg-[#f8f9fa] p-4">
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-md w-full bg-white rounded-3xl shadow-2xl p-10 text-center border border-gray-100"
    >
      <div className="w-20 h-20 bg-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-8 shadow-lg rotate-3">
        <Award className="w-10 h-10 text-white" />
      </div>
      <h1 className="text-3xl font-extrabold text-gray-900 mb-3 tracking-tight">Nurse CPD Portal</h1>
      <p className="text-gray-500 mb-10 leading-relaxed">
        Accredited continuing professional development for South African healthcare professionals.
      </p>
      <button 
        onClick={signIn}
        className="w-full py-4 px-6 bg-white border-2 border-gray-200 text-gray-700 rounded-2xl font-bold hover:border-blue-600 hover:text-blue-600 transition-all flex items-center justify-center gap-3 group"
      >
        <img src="https://www.google.com/favicon.ico" className="w-5 h-5" alt="Google" />
        Sign in with Google
      </button>
      <p className="mt-8 text-xs text-gray-400 uppercase tracking-widest font-semibold">
        SANC Accredited Provider
      </p>
    </motion.div>
  </div>
);

// --- Verification View Component ---
const VerificationView = ({ registrationId }: { registrationId: string }) => {
  const [data, setData] = useState<{ reg: Registration; webinar: Webinar; user: UserProfile } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchVerification = async () => {
      const path = `registrations/${registrationId}`;
      try {
        const regDoc = await getDoc(doc(db, 'registrations', registrationId));
        if (!regDoc.exists()) {
          setError('Certificate not found or invalid.');
          setLoading(false);
          return;
        }
        const reg = regDoc.data() as Registration;
        
        if (!reg.certificateIssued) {
          setError('Certificate has not been issued for this registration.');
          setLoading(false);
          return;
        }

        const webinarPath = `webinars/${reg.webinarId}`;
        const userPath = `users/${reg.userId}`;
        
        // Attempt to fetch webinar and user. 
        // Note: User profile might be locked down, so we use denormalized data if needed.
        const webinarDoc = await getDoc(doc(db, 'webinars', reg.webinarId));
        
        let userData: Partial<UserProfile> = {
          displayName: (reg as any).userDisplayName || 'Unknown Practitioner',
          sancNumber: (reg as any).userSancNumber || 'N/A'
        };

        try {
          const userDoc = await getDoc(doc(db, 'users', reg.userId));
          if (userDoc.exists()) {
            userData = userDoc.data() as UserProfile;
          }
        } catch (e) {
          console.log('User profile locked down, using denormalized data from registration.');
        }

        if (!webinarDoc.exists()) {
          setError('Associated webinar data not found.');
          setLoading(false);
          return;
        }

        setData({
          reg,
          webinar: webinarDoc.data() as Webinar,
          user: userData as UserProfile
        });
        setLoading(false);
      } catch (err: any) {
        handleFirestoreError(err, OperationType.GET, path);
        setError(err.message);
        setLoading(false);
      }
    };

    fetchVerification();
  }, [registrationId]);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
    </div>
  );

  if (error) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="max-w-md w-full bg-white rounded-3xl shadow-xl p-10 text-center border border-red-100">
        <div className="w-20 h-20 bg-red-100 rounded-2xl flex items-center justify-center mx-auto mb-8">
          <AlertCircle className="w-10 h-10 text-red-600" />
        </div>
        <h2 className="text-2xl font-black text-gray-900 mb-4">Verification Failed</h2>
        <p className="text-gray-600 mb-8 font-medium leading-relaxed">{error}</p>
        <button 
          onClick={() => window.location.href = '/'}
          className="w-full py-4 bg-gray-900 text-white rounded-2xl font-black text-lg hover:bg-black transition-all"
        >
          Go to Portal
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f8f9fa] p-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-2xl w-full bg-white rounded-[3rem] shadow-2xl p-12 border border-gray-100 relative overflow-hidden"
      >
        <div className="absolute top-0 right-0 w-40 h-40 bg-green-50 rounded-bl-[5rem] -mr-10 -mt-10 flex items-center justify-center">
          <ShieldCheck className="w-16 h-16 text-green-500 opacity-20" />
        </div>

        <div className="flex items-center gap-4 mb-10">
          <div className="w-16 h-16 bg-green-100 rounded-2xl flex items-center justify-center">
            <ShieldCheck className="w-8 h-8 text-green-600" />
          </div>
          <div>
            <h1 className="text-3xl font-black text-gray-900 tracking-tight">Authenticity Verified</h1>
            <p className="text-green-600 font-bold text-sm uppercase tracking-widest">Official CPD Record</p>
          </div>
        </div>

        <div className="space-y-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
            <div>
              <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Practitioner</p>
              <p className="text-xl font-black text-gray-900">{data?.user.displayName}</p>
              <p className="text-sm text-gray-500 font-bold">SANC: {data?.user.sancNumber}</p>
            </div>
            <div>
              <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-2">CPD Points</p>
              <p className="text-4xl font-black text-blue-600">{data?.webinar.cpdPoints}</p>
              <p className="text-sm text-gray-500 font-bold uppercase tracking-widest">Accredited</p>
            </div>
          </div>

          <div className="p-8 bg-gray-50 rounded-[2rem] border border-gray-100">
            <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-3">Activity Details</p>
            <h3 className="text-2xl font-black text-gray-900 mb-4 leading-tight">{data?.webinar.title}</h3>
            <div className="space-y-2">
              <p className="text-sm text-gray-600 font-bold flex items-center gap-2">
                <Award className="w-4 h-4 text-blue-600" />
                Provider: {data?.webinar.provider}
              </p>
              <p className="text-sm text-gray-600 font-bold flex items-center gap-2">
                <FileText className="w-4 h-4 text-blue-600" />
                Accreditation: {data?.webinar.accreditationNumber}
              </p>
              <p className="text-sm text-gray-600 font-bold flex items-center gap-2">
                <Clock className="w-4 h-4 text-blue-600" />
                Completed: {format(data?.reg.registeredAt.toDate() || new Date(), 'PPP')}
              </p>
            </div>
          </div>

          <div className="pt-8 border-t border-gray-100 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center">
                <Award className="w-5 h-5 text-white" />
              </div>
              <p className="text-xs text-gray-400 font-bold uppercase tracking-widest leading-tight">
                Nurse CPD Portal<br/>Verification System
              </p>
            </div>
            <button 
              onClick={() => window.location.href = '/'}
              className="px-8 py-4 bg-gray-900 text-white rounded-2xl font-black text-sm hover:bg-black transition-all shadow-lg shadow-gray-200"
            >
              Portal Login
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

// --- Main App Component ---
export default function App() {
  const path = window.location.pathname;
  const verifyMatch = path.match(/^\/verify\/(.+)$/);

  if (verifyMatch) {
    return <VerificationView registrationId={verifyMatch[1]} />;
  }

  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [webinars, setWebinars] = useState<Webinar[]>([]);
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'webinars' | 'certificates' | 'admin'>('dashboard');
  const [selectedWebinar, setSelectedWebinar] = useState<Webinar | null>(null);
  const [quizMode, setQuizMode] = useState(false);
  const [showProfileSetup, setShowProfileSetup] = useState(false);
  const [showAdminForm, setShowAdminForm] = useState(false);
  const [editingWebinar, setEditingWebinar] = useState<Webinar | null>(null);
  const [watchTime, setWatchTime] = useState(0);
  const [isWatching, setIsWatching] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // --- Auth & Data Sync ---
  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) {
        try {
          // Test connection
          await getDocFromServer(doc(db, 'test', 'connection')).catch(() => {});
          
          // Real-time Profile Sync
          const userRef = doc(db, 'users', u.uid);
          const unsubProfile = onSnapshot(userRef, (snap) => {
            if (snap.exists()) {
              const data = snap.data() as UserProfile;
              setProfile(data);
              if (!data.sancNumber) setShowProfileSetup(true);
            } else {
              const newProfile: UserProfile = {
                uid: u.uid,
                displayName: u.displayName || 'Nurse',
                email: u.email || '',
                role: 'nurse',
                totalCpdPoints: 0,
                createdAt: Timestamp.now()
              };
              setDoc(userRef, newProfile).catch(err => handleFirestoreError(err, OperationType.WRITE, `users/${u.uid}`));
              setProfile(newProfile);
              setShowProfileSetup(true);
            }
          }, (err) => handleFirestoreError(err, OperationType.GET, `users/${u.uid}`));

          // Real-time Webinars
          const qWebinars = query(collection(db, 'webinars'), orderBy('startTime', 'desc'));
          const unsubWebinars = onSnapshot(qWebinars, (snap) => {
            setWebinars(snap.docs.map(d => ({ id: d.id, ...d.data() } as Webinar)));
          }, (err) => handleFirestoreError(err, OperationType.LIST, 'webinars'));

          // Real-time Registrations
          const qRegs = query(collection(db, 'registrations'), where('userId', '==', u.uid));
          const unsubRegs = onSnapshot(qRegs, (snap) => {
            setRegistrations(snap.docs.map(d => ({ id: d.id, ...d.data() } as Registration)));
          }, (err) => handleFirestoreError(err, OperationType.LIST, 'registrations'));

          setLoading(false);
          return () => {
            unsubProfile();
            unsubWebinars();
            unsubRegs();
          };
        } catch (err: any) {
          setError(err.message);
          setLoading(false);
        }
      } else {
        setProfile(null);
        setLoading(false);
      }
    });

    return () => unsubscribeAuth();
  }, []);

  useEffect(() => {
    let interval: any;
    if (isWatching && selectedWebinar && !quizMode) {
      interval = setInterval(() => {
        setWatchTime(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isWatching, selectedWebinar, quizMode]);

  const handleRegister = async (webinarId: string) => {
    if (!user) return;
    const regId = `${user.uid}_${webinarId}`;
    const path = `registrations/${regId}`;
    try {
      await setDoc(doc(db, 'registrations', regId), {
        id: regId,
        userId: user.uid,
        webinarId,
        registeredAt: Timestamp.now(),
        attended: false,
        certificateIssued: false
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, path);
    }
  };

  const handleCompleteQuiz = async (webinar: Webinar, score: number) => {
    if (!user || !profile) return;
    const regId = `${user.uid}_${webinar.id}`;
    const regPath = `registrations/${regId}`;
    const userPath = `users/${user.uid}`;
    
    const passed = score >= 80; // 80% pass mark
    
    try {
      await updateDoc(doc(db, 'registrations', regId), {
        attended: true,
        quizScore: score,
        certificateIssued: passed,
        // Denormalize for verification
        userDisplayName: profile.displayName,
        userSancNumber: profile.sancNumber || 'N/A'
      });

      if (passed) {
        const newPoints = profile.totalCpdPoints + webinar.cpdPoints;
        await updateDoc(doc(db, 'users', user.uid), {
          totalCpdPoints: newPoints
        });
        setProfile(prev => prev ? { ...prev, totalCpdPoints: newPoints } : null);
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, regPath);
    }

    setQuizMode(false);
    setSelectedWebinar(null);
  };

  const seedData = async () => {
    const sampleWebinars: Webinar[] = [
      {
        id: 'webinar_1',
        title: 'Advanced Wound Care 2026',
        description: 'Latest techniques in chronic wound management, dressing selection, and negative pressure therapy.',
        provider: 'Wound Care Academy',
        accreditationNumber: 'CPD-2026-WCA-001',
        cpdPoints: 3,
        startTime: Timestamp.fromDate(new Date(Date.now() - 86400000 * 15)), // 15 days ago
        durationMinutes: 90,
        zoomLink: 'https://zoom.us/j/123456789',
        price: 150,
        quiz: [
          {
            question: 'Which dressing is best for highly exudating wounds?',
            options: ['Film dressing', 'Hydrogel', 'Alginate', 'Dry gauze'],
            correctAnswer: 2
          }
        ]
      },
      {
        id: 'webinar_2',
        title: 'Emergency CPR & Resuscitation',
        description: 'Updated 2026 guidelines for Basic Life Support (BLS) and Advanced Cardiovascular Life Support (ACLS).',
        provider: 'Resus Council SA',
        accreditationNumber: 'CPD-2026-RCSA-012',
        cpdPoints: 4,
        startTime: Timestamp.fromDate(new Date(Date.now() - 86400000 * 10)), // 10 days ago
        durationMinutes: 180,
        zoomLink: 'https://zoom.us/j/111222333',
        price: 250,
        quiz: [
          {
            question: 'What is the recommended compression depth for adults?',
            options: ['1-2 cm', '3-4 cm', '5-6 cm', '7-8 cm'],
            correctAnswer: 2
          }
        ]
      },
      {
        id: 'webinar_3',
        title: 'Pediatric Emergency Care',
        description: 'Specialized focus on pediatric triage, stabilization, and common childhood emergencies.',
        provider: 'Global Health Training',
        accreditationNumber: 'CPD-2026-GHT-042',
        cpdPoints: 3,
        startTime: Timestamp.fromDate(new Date(Date.now() - 86400000 * 5)), // 5 days ago
        durationMinutes: 90,
        zoomLink: 'https://zoom.us/j/987654321',
        price: 0,
        quiz: [
          {
            question: 'Which is the preferred site for an IO needle in a child?',
            options: ['Proximal Tibia', 'Distal Femur', 'Proximal Humerus', 'Sternum'],
            correctAnswer: 0
          }
        ]
      },
      {
        id: 'webinar_4',
        title: 'Gynaecology & Obstetrics Essentials',
        description: 'Managing common obstetric emergencies and prenatal care protocols.',
        provider: 'Women\'s Health Institute',
        accreditationNumber: 'CPD-2026-WHI-088',
        cpdPoints: 5,
        startTime: Timestamp.fromDate(new Date(Date.now() - 86400000 * 2)), // 2 days ago
        durationMinutes: 240,
        zoomLink: 'https://zoom.us/j/777888999',
        price: 450,
        quiz: [
          {
            question: 'What is the primary sign of pre-eclampsia?',
            options: ['Low blood pressure', 'High blood pressure and proteinuria', 'Excessive hunger', 'Increased energy'],
            correctAnswer: 1
          }
        ]
      },
      {
        id: 'webinar_5',
        title: 'Mechanical Ventilation Fundamentals',
        description: 'Understanding ventilator modes, settings, and patient weaning strategies.',
        provider: 'ICU Academy',
        accreditationNumber: 'CPD-2026-ICU-021',
        cpdPoints: 4,
        startTime: Timestamp.fromDate(new Date(Date.now() + 86400000 * 2)), // 2 days from now
        durationMinutes: 150,
        zoomLink: 'https://zoom.us/j/000111222',
        price: 300,
        quiz: [
          {
            question: 'What does PEEP stand for?',
            options: ['Positive End-Expiratory Pressure', 'Primary Emergency Entry Point', 'Partial End-Expiratory Pressure', 'Positive Entry-Exit Point'],
            correctAnswer: 0
          }
        ]
      },
      {
        id: 'webinar_6',
        title: 'Primary Care in Rural Settings',
        description: 'Challenges and solutions for delivering primary healthcare in underserved areas.',
        provider: 'Rural Health Network',
        accreditationNumber: 'CPD-2026-RHN-015',
        cpdPoints: 3,
        startTime: Timestamp.fromDate(new Date(Date.now() + 86400000 * 5)), // 5 days from now
        durationMinutes: 120,
        zoomLink: 'https://zoom.us/j/333444555',
        price: 0,
        quiz: [
          {
            question: 'Which is a key component of Primary Healthcare (PHC)?',
            options: ['Specialized surgery', 'Community participation', 'High-cost technology', 'Urban-only clinics'],
            correctAnswer: 1
          }
        ]
      },
      {
        id: 'webinar_7',
        title: 'Safe Medication Management',
        description: 'Reducing medication errors and understanding pharmacovigilance.',
        provider: 'Pharmacy Council SA',
        accreditationNumber: 'CPD-2026-PCSA-099',
        cpdPoints: 2,
        startTime: Timestamp.fromDate(new Date(Date.now() + 86400000 * 8)), // 8 days from now
        durationMinutes: 60,
        zoomLink: 'https://zoom.us/j/666777888',
        price: 150,
        quiz: [
          {
            question: 'What are the "5 Rights" of medication administration?',
            options: ['Right patient, drug, dose, route, time', 'Right color, shape, size, smell, taste', 'Right doctor, nurse, hospital, ward, bed', 'Right day, month, year, hour, minute'],
            correctAnswer: 0
          }
        ]
      },
      {
        id: 'webinar_8',
        title: 'Diabetes Management Update 2026',
        description: 'New guidelines for Type 2 diabetes management and insulin therapy.',
        provider: 'Endocrine Society',
        accreditationNumber: 'CPD-2026-ES-055',
        cpdPoints: 4,
        startTime: Timestamp.fromDate(new Date(Date.now() + 86400000 * 12)), // 12 days from now
        durationMinutes: 180,
        zoomLink: 'https://zoom.us/j/111222333',
        price: 200,
        quiz: [
          {
            question: 'What is the target HbA1c for most non-pregnant adults with diabetes?',
            options: ['< 6.0%', '< 7.0%', '< 8.0%', '< 9.0%'],
            correctAnswer: 1
          }
        ]
      },
      {
        id: 'webinar_9',
        title: 'Ethics in Modern Nursing',
        description: 'Navigating complex ethical dilemmas in patient care and professional practice.',
        provider: 'Nurse Ethics Board',
        accreditationNumber: 'CPD-2026-NEB-112',
        cpdPoints: 2,
        startTime: Timestamp.fromDate(new Date(Date.now() + 86400000 * 15)), // 15 days from now
        durationMinutes: 60,
        zoomLink: 'https://zoom.us/j/456789123',
        price: 150,
        quiz: [
          {
            question: 'What does "autonomy" refer to in nursing ethics?',
            options: ['The right to self-determination', 'Doing good for the patient', 'Avoiding harm', 'Fairness in resource allocation'],
            correctAnswer: 0
          }
        ]
      }
    ];

    for (const w of sampleWebinars) {
      await setDoc(doc(db, 'webinars', w.id), w).catch(err => handleFirestoreError(err, OperationType.WRITE, `webinars/${w.id}`));
    }

    // Seed some completed registrations for the current user to show certificates
    if (user) {
      // Completed ones
      const pastWebinars = sampleWebinars.filter(w => w.startTime.toDate() < new Date());
      let totalPoints = 0;
      for (const w of pastWebinars) {
        totalPoints += w.cpdPoints;
        const regId = `${user.uid}_${w.id}`;
        await setDoc(doc(db, 'registrations', regId), {
          id: regId,
          userId: user.uid,
          webinarId: w.id,
          registeredAt: Timestamp.fromDate(new Date(w.startTime.toDate().getTime() - 86400000 * 2)),
          attended: true,
          paid: true,
          quizScore: 90 + Math.floor(Math.random() * 10),
          certificateIssued: true,
          userDisplayName: profile?.displayName || user.displayName || 'Nurse',
          userSancNumber: profile?.sancNumber || 'SANC-2026-DEMO-999'
        }).catch(err => handleFirestoreError(err, OperationType.WRITE, `registrations/${regId}`));
      }

      // Upcoming ones
      const upcomingWebinars = sampleWebinars.filter(w => w.startTime.toDate() > new Date()).slice(0, 2);
      for (const w of upcomingWebinars) {
        const regId = `${user.uid}_${w.id}`;
        await setDoc(doc(db, 'registrations', regId), {
          id: regId,
          userId: user.uid,
          webinarId: w.id,
          registeredAt: Timestamp.now(),
          attended: false,
          paid: w.price === 0,
          certificateIssued: false
        }).catch(err => handleFirestoreError(err, OperationType.WRITE, `registrations/${regId}`));
      }

      await updateDoc(doc(db, 'users', user.uid), { 
        totalCpdPoints: totalPoints,
        sancNumber: profile?.sancNumber || 'SANC-2026-DEMO-999',
        isPremium: true
      }).catch(err => handleFirestoreError(err, OperationType.UPDATE, `users/${user.uid}`));
    }

    alert('Demo data seeded successfully! Your profile is now populated with completed and upcoming webinars.');
  };

  const handleUpdateProfile = async (sancNumber: string) => {
    if (!user) return;
    const path = `users/${user.uid}`;
    try {
      await updateDoc(doc(db, 'users', user.uid), { sancNumber });
      setProfile(prev => prev ? { ...prev, sancNumber } : null);
      setShowProfileSetup(false);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, path);
    }
  };

  const handleSaveWebinar = async (webinarData: Partial<Webinar>) => {
    const id = editingWebinar?.id || `webinar_${Date.now()}`;
    const path = `webinars/${id}`;
    const newWebinar = {
      ...webinarData,
      id,
      startTime: Timestamp.now(), // Simplified for demo
      quiz: webinarData.quiz || []
    };
    try {
      await setDoc(doc(db, 'webinars', id), newWebinar);
      setShowAdminForm(false);
      setEditingWebinar(null);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, path);
    }
  };

  const handleDeleteWebinar = async (id: string) => {
    const path = `webinars/${id}`;
    try {
      await setDoc(doc(db, 'webinars', id), { deleted: true }, { merge: true }); // Soft delete
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, path);
    }
  };

  const handlePurchase = async (webinarId: string) => {
    if (!user) return;
    const regId = `${user.uid}_${webinarId}`;
    const path = `registrations/${regId}`;
    try {
      await updateDoc(doc(db, 'registrations', regId), { paid: true });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, path);
    }
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
        <p className="text-gray-500 font-medium animate-pulse">Initializing Portal...</p>
      </div>
    </div>
  );

  if (error) return <ErrorBoundary error={error} onRetry={() => window.location.reload()} />;
  if (!user) return <Login />;

  return (
    <div className="min-h-screen bg-[#f8f9fa] flex">
      {/* Sidebar */}
      <aside className="w-72 bg-white border-r border-gray-100 flex flex-col p-6 sticky top-0 h-screen">
        <div className="flex items-center gap-3 mb-12 px-2">
          <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-200">
            <Award className="w-6 h-6 text-white" />
          </div>
          <span className="font-black text-xl tracking-tight text-gray-900">CPD PORTAL</span>
        </div>

        <nav className="flex-1 space-y-2">
          {[
            { id: 'dashboard', icon: LayoutDashboard, label: 'Dashboard' },
            { id: 'webinars', icon: Video, label: 'Webinars' },
            { id: 'certificates', icon: FileText, label: 'Certificates' },
            profile?.role === 'admin' && { id: 'admin', icon: ShieldCheck, label: 'Admin' },
          ].filter(Boolean).map((item: any) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id as any)}
              className={cn(
                "w-full flex items-center gap-4 px-4 py-3.5 rounded-2xl font-bold transition-all duration-200",
                activeTab === item.id 
                  ? "bg-blue-50 text-blue-600 shadow-sm" 
                  : "text-gray-400 hover:bg-gray-50 hover:text-gray-600"
              )}
            >
              <item.icon className="w-5 h-5" />
              {item.label}
            </button>
          ))}
        </nav>

        <div className="mt-auto pt-6 border-t border-gray-50">
          <button 
            onClick={seedData}
            className="w-full mb-4 flex items-center gap-4 px-4 py-3.5 bg-blue-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-blue-700 transition-all shadow-lg shadow-blue-100"
          >
            <ShieldCheck className="w-5 h-5" />
            Seed Demo Data
          </button>

          <div className="bg-gray-50 rounded-2xl p-4 mb-4 flex items-center gap-3">
            <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-sm">
              <UserIcon className="w-5 h-5 text-gray-400" />
            </div>
            <div className="overflow-hidden">
              <p className="text-sm font-bold text-gray-900 truncate">{profile?.displayName}</p>
              <p className="text-[10px] text-gray-400 uppercase tracking-wider font-bold">Nurse Profile</p>
            </div>
          </div>
          {!profile?.isPremium && (
            <button 
              onClick={async () => {
                if (user) {
                  await updateDoc(doc(db, 'users', user.uid), { isPremium: true });
                }
              }}
              className="w-full mb-4 p-4 bg-amber-50 rounded-2xl border border-amber-100 text-left hover:bg-amber-100 transition-colors group"
            >
              <div className="flex items-center gap-2 text-amber-700 font-black text-xs uppercase tracking-widest mb-1">
                <Star className="w-3 h-3 fill-current" /> Premium
              </div>
              <p className="text-xs text-amber-900 font-bold">Unlock all webinars for R199/mo</p>
            </button>
          )}
          <button 
            onClick={logOut}
            className="w-full flex items-center gap-4 px-4 py-3 text-red-500 font-bold hover:bg-red-50 rounded-2xl transition-colors"
          >
            <LogOut className="w-5 h-5" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-10 max-w-6xl mx-auto">
        <AnimatePresence mode="wait">
          {activeTab === 'dashboard' && (
            <motion.div 
              key="dashboard"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-8"
            >
              <header>
                <div className="flex items-center gap-4 mb-2">
                  <h2 className="text-4xl font-black text-gray-900">Welcome back, {profile?.displayName?.split(' ')[0]}</h2>
                  {profile?.isPremium && (
                    <span className="px-3 py-1 bg-amber-100 text-amber-700 text-xs font-black uppercase tracking-widest rounded-full flex items-center gap-1">
                      <Star className="w-3 h-3 fill-current" /> Premium
                    </span>
                  )}
                </div>
                <div className="flex items-center justify-between">
                  <p className="text-gray-500 font-medium">Here's your CPD progress for the current cycle.</p>
                  <div className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-600 rounded-xl text-xs font-black uppercase tracking-widest border border-blue-100">
                    <Award className="w-4 h-4" />
                    2026 Cycle Active
                  </div>
                </div>
              </header>

              {registrations.length === 0 && (
                <div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-[2.5rem] p-10 text-white relative overflow-hidden shadow-2xl shadow-blue-200">
                  <div className="relative z-10">
                    <h3 className="text-3xl font-black mb-4">Ready to showcase the platform?</h3>
                    <p className="text-blue-100 font-medium mb-8 max-w-lg leading-relaxed">
                      Populate your dashboard with sample webinars, completed certificates, and real-time progress tracking to see the full potential of the CPD Portal.
                    </p>
                    <button 
                      onClick={seedData}
                      className="px-8 py-4 bg-white text-blue-600 rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-blue-50 transition-all shadow-xl"
                    >
                      Seed Demo Data Now
                    </button>
                  </div>
                  <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full -mr-32 -mt-32 blur-3xl" />
                  <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-400/20 rounded-full -ml-32 -mb-32 blur-2xl" />
                </div>
              )}

              <div className="grid grid-cols-3 gap-6">
                <div className="bg-white p-8 rounded-[2rem] shadow-sm border border-gray-100 relative overflow-hidden group">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-blue-50 rounded-full -mr-16 -mt-16 transition-transform group-hover:scale-110" />
                  <p className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-4">Total Points</p>
                  <p className="text-6xl font-black text-blue-600">{profile?.totalCpdPoints}</p>
                  <div className="mt-6 flex items-center gap-2 text-green-600 font-bold text-sm">
                    <ShieldCheck className="w-4 h-4" />
                    SANC Compliant
                  </div>
                </div>

                <div className="bg-white p-8 rounded-[2rem] shadow-sm border border-gray-100">
                  <p className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-4">Webinars Attended</p>
                  <p className="text-6xl font-black text-gray-900">{registrations.filter(r => r.attended).length}</p>
                  <p className="mt-6 text-sm text-gray-400 font-medium">Out of {registrations.length} registered</p>
                </div>

                <div className="bg-white p-8 rounded-[2rem] shadow-sm border border-gray-100">
                  <p className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-4">Next Goal</p>
                  <p className="text-6xl font-black text-gray-900">30</p>
                  <div className="mt-6 w-full bg-gray-100 h-2 rounded-full overflow-hidden">
                    <div 
                      className="bg-blue-600 h-full transition-all duration-1000" 
                      style={{ width: `${Math.min((profile?.totalCpdPoints || 0) / 30 * 100, 100)}%` }} 
                    />
                  </div>
                </div>
              </div>

              <section>
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-2xl font-black text-gray-900">Recent Activities</h3>
                  <button onClick={() => setActiveTab('webinars')} className="text-blue-600 font-bold text-sm flex items-center gap-1 hover:underline">
                    View all <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
                <div className="bg-white rounded-[2rem] shadow-sm border border-gray-100 overflow-hidden">
                  {registrations.length === 0 ? (
                    <div className="p-12 text-center">
                      <Video className="w-12 h-12 text-gray-200 mx-auto mb-4" />
                      <p className="text-gray-400 font-bold">No activities logged yet.</p>
                    </div>
                  ) : (
                    <div className="divide-y divide-gray-50">
                      {registrations.slice(0, 5).map(reg => {
                        const webinar = webinars.find(w => w.id === reg.webinarId);
                        return (
                          <div key={reg.id} className="p-6 flex items-center justify-between hover:bg-gray-50 transition-colors">
                            <div className="flex items-center gap-4">
                              <div className={cn(
                                "w-12 h-12 rounded-2xl flex items-center justify-center",
                                reg.attended ? "bg-green-50 text-green-600" : "bg-blue-50 text-blue-600"
                              )}>
                                {reg.attended ? <CheckCircle className="w-6 h-6" /> : <Clock className="w-6 h-6" />}
                              </div>
                              <div>
                                <p className="font-bold text-gray-900">{webinar?.title || 'Loading...'}</p>
                                <p className="text-xs text-gray-400 font-bold uppercase tracking-wider">
                                  {format(reg.registeredAt.toDate(), 'PPP')}
                                </p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="font-black text-gray-900">+{webinar?.cpdPoints || 0} pts</p>
                              <p className={cn(
                                "text-[10px] font-black uppercase tracking-widest",
                                reg.attended ? "text-green-500" : "text-blue-500"
                              )}>
                                {reg.attended ? 'Completed' : 'Upcoming'}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </section>
            </motion.div>
          )}

          {activeTab === 'webinars' && (
            <motion.div 
              key="webinars"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-8"
            >
              <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                  <h2 className="text-4xl font-black text-gray-900 mb-2">Accredited Webinars</h2>
                  <p className="text-gray-500 font-medium">Browse and register for upcoming live sessions.</p>
                </div>
                <div className="flex items-center gap-4">
                  <div className="relative group">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-blue-600 transition-colors" />
                    <input 
                      type="text" 
                      placeholder="Search webinars..." 
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-12 pr-6 py-3 bg-white border border-gray-100 rounded-2xl shadow-sm focus:border-blue-600 outline-none font-bold text-sm min-w-[280px] transition-all"
                    />
                  </div>
                  <div className="flex bg-white p-1 rounded-2xl border border-gray-100 shadow-sm">
                    <button 
                      onClick={() => setViewMode('grid')}
                      className={cn(
                        "p-2 rounded-xl transition-all",
                        viewMode === 'grid' ? "bg-blue-600 text-white shadow-lg shadow-blue-100" : "text-gray-400 hover:text-gray-600"
                      )}
                    >
                      <LayoutGrid className="w-5 h-5" />
                    </button>
                    <button 
                      onClick={() => setViewMode('list')}
                      className={cn(
                        "p-2 rounded-xl transition-all",
                        viewMode === 'list' ? "bg-blue-600 text-white shadow-lg shadow-blue-100" : "text-gray-400 hover:text-gray-600"
                      )}
                    >
                      <List className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </header>

              {webinars.filter(w => 
                w.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                w.provider.toLowerCase().includes(searchQuery.toLowerCase())
              ).length === 0 ? (
                <div className="bg-white rounded-[2.5rem] p-20 text-center border border-gray-100 shadow-sm">
                  <Search className="w-16 h-16 text-gray-100 mx-auto mb-6" />
                  <p className="text-gray-400 font-bold text-lg">No webinars found matching "{searchQuery}"</p>
                  <button 
                    onClick={() => setSearchQuery('')}
                    className="mt-4 text-blue-600 font-bold hover:underline"
                  >
                    Clear search
                  </button>
                </div>
              ) : viewMode === 'grid' ? (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  {webinars.filter(w => 
                    w.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                    w.provider.toLowerCase().includes(searchQuery.toLowerCase())
                  ).map(webinar => {
                    const reg = registrations.find(r => r.webinarId === webinar.id);
                    return (
                      <div key={webinar.id} className="bg-white rounded-[2.5rem] shadow-sm border border-gray-100 overflow-hidden flex flex-col group">
                        <div className="h-48 bg-gray-100 relative overflow-hidden">
                          <img 
                            src={`https://picsum.photos/seed/${webinar.id}/800/400`} 
                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" 
                            alt={webinar.title}
                            referrerPolicy="no-referrer"
                          />
                          <div className="absolute top-4 left-4 bg-white/90 backdrop-blur px-3 py-1.5 rounded-xl text-xs font-black text-blue-600 shadow-sm">
                            {webinar.cpdPoints} CPD POINTS
                          </div>
                        </div>
                        <div className="p-8 flex-1 flex flex-col">
                          <h3 className="text-2xl font-black text-gray-900 mb-3 leading-tight">{webinar.title}</h3>
                          <p className="text-gray-500 text-sm mb-6 line-clamp-2 leading-relaxed">{webinar.description}</p>
                          
                          <div className="mt-auto space-y-4">
                            <div className="flex items-center gap-6 text-xs font-bold text-gray-400">
                              <div className="flex items-center gap-2">
                                <Clock className="w-4 h-4" />
                                {formatDuration(webinar.durationMinutes)}
                              </div>
                              <div className="flex items-center gap-2">
                                <FileText className="w-4 h-4" />
                                {webinar.quiz.length} Questions
                              </div>
                            </div>

                            {reg ? (
                              reg.paid || !webinar.price || profile?.isPremium ? (
                                <button 
                                  onClick={() => setSelectedWebinar(webinar)}
                                  className={cn(
                                    "w-full py-4 rounded-2xl font-black text-sm tracking-widest uppercase transition-all flex items-center justify-center gap-3",
                                    reg.attended 
                                      ? "bg-green-50 text-green-600 cursor-default" 
                                      : "bg-blue-600 text-white hover:bg-blue-700 shadow-lg shadow-blue-100"
                                  )}
                                >
                                  {reg.attended ? (
                                    <><CheckCircle className="w-5 h-5" /> Completed</>
                                  ) : (
                                    <><Play className="w-5 h-5 fill-current" /> Join Session</>
                                  )}
                                </button>
                              ) : (
                                <button 
                                  onClick={() => handlePurchase(webinar.id)}
                                  className="w-full py-4 bg-amber-500 text-white rounded-2xl font-black text-sm tracking-widest uppercase hover:bg-amber-600 transition-all shadow-lg shadow-amber-100 flex items-center justify-center gap-2"
                                >
                                  <CreditCard className="w-5 h-5" />
                                  Buy Ticket (R{webinar.price})
                                </button>
                              )
                            ) : (
                              <button 
                                onClick={() => handleRegister(webinar.id)}
                                className="w-full py-4 bg-gray-900 text-white rounded-2xl font-black text-sm tracking-widest uppercase hover:bg-black transition-all shadow-lg shadow-gray-200"
                              >
                                Register Now
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="bg-white rounded-[2.5rem] shadow-sm border border-gray-100 overflow-hidden">
                  <div className="divide-y divide-gray-50">
                    {webinars.filter(w => 
                      w.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                      w.provider.toLowerCase().includes(searchQuery.toLowerCase())
                    ).map(webinar => {
                      const reg = registrations.find(r => r.webinarId === webinar.id);
                      return (
                        <div key={webinar.id} className="p-8 flex items-center justify-between hover:bg-gray-50 transition-colors group">
                          <div className="flex items-center gap-6">
                            <div className="w-20 h-20 bg-gray-100 rounded-2xl overflow-hidden flex-shrink-0">
                              <img 
                                src={`https://picsum.photos/seed/${webinar.id}/200/200`} 
                                alt={webinar.title}
                                className="w-full h-full object-cover"
                                referrerPolicy="no-referrer"
                              />
                            </div>
                            <div>
                              <h3 className="text-xl font-black text-gray-900 mb-1 group-hover:text-blue-600 transition-colors">{webinar.title}</h3>
                              <p className="text-sm text-gray-400 font-bold uppercase tracking-widest mb-2">{webinar.provider}</p>
                              <div className="flex items-center gap-4 text-xs font-bold text-gray-400 uppercase tracking-widest">
                                <span className="flex items-center gap-1 text-blue-600">{webinar.cpdPoints} Points</span>
                                <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {format(webinar.startTime.toDate(), 'MMM d')}</span>
                                <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {webinar.durationMinutes}m</span>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-4">
                            {reg ? (
                              reg.paid || !webinar.price || profile?.isPremium ? (
                                <button 
                                  onClick={() => setSelectedWebinar(webinar)}
                                  className={cn(
                                    "px-8 py-3 rounded-xl font-black text-xs uppercase tracking-widest transition-all flex items-center gap-2",
                                    reg.attended 
                                      ? "bg-green-50 text-green-600 cursor-default" 
                                      : "bg-blue-600 text-white hover:bg-blue-700 shadow-lg shadow-blue-100"
                                  )}
                                >
                                  {reg.attended ? <CheckCircle className="w-4 h-4" /> : <Play className="w-4 h-4 fill-current" />}
                                  {reg.attended ? 'Completed' : 'Join'}
                                </button>
                              ) : (
                                <button 
                                  onClick={() => handlePurchase(webinar.id)}
                                  className="px-8 py-3 bg-amber-500 text-white rounded-xl font-black text-xs uppercase tracking-widest hover:bg-amber-600 transition-all shadow-lg shadow-amber-100 flex items-center gap-2"
                                >
                                  <CreditCard className="w-4 h-4" />
                                  Buy (R{webinar.price})
                                </button>
                              )
                            ) : (
                              <button 
                                onClick={() => handleRegister(webinar.id)}
                                className="px-8 py-3 bg-gray-900 text-white rounded-xl font-black text-xs uppercase tracking-widest hover:bg-black transition-all"
                              >
                                Register
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {activeTab === 'certificates' && (
            <motion.div 
              key="certificates"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-8"
            >
              <header>
                <h2 className="text-4xl font-black text-gray-900 mb-2">My Certificates</h2>
                <p className="text-gray-500 font-medium">Download your earned CPD certificates for your portfolio.</p>
              </header>

              <div className="bg-white rounded-[2rem] shadow-sm border border-gray-100 overflow-hidden">
                {registrations.filter(r => r.certificateIssued).length === 0 ? (
                  <div className="p-20 text-center">
                    <Award className="w-16 h-16 text-gray-100 mx-auto mb-6" />
                    <p className="text-gray-400 font-bold text-lg">No certificates earned yet.</p>
                    <p className="text-gray-400 text-sm mt-2 mb-8">Complete a webinar and pass the quiz to earn points.</p>
                    <div className="flex flex-col sm:flex-row gap-4 justify-center">
                      <button 
                        onClick={async () => {
                          if (profile) {
                            const sampleWebinar: Webinar = {
                              id: 'sample',
                              title: 'Sample CPD Webinar',
                              description: 'This is a sample certificate for demonstration purposes.',
                              provider: 'MediLearn Academy',
                              accreditationNumber: 'CPD-SAMPLE-001',
                              cpdPoints: 5,
                              startTime: Timestamp.now(),
                              durationMinutes: 60,
                              zoomLink: '',
                              price: 0,
                              quiz: []
                            };
                            const url = await generateCertificate(profile, sampleWebinar);
                            window.open(url, '_blank');
                          }
                        }}
                        className="inline-flex items-center gap-3 px-8 py-4 bg-gray-100 text-gray-900 rounded-2xl font-black text-sm hover:bg-gray-200 transition-all"
                      >
                        <Download className="w-5 h-5" />
                        Download Sample PDF
                      </button>
                      <button 
                        onClick={seedData}
                        className="inline-flex items-center gap-3 px-8 py-4 bg-blue-600 text-white rounded-2xl font-black text-sm hover:bg-blue-700 transition-all shadow-lg shadow-blue-100"
                      >
                        <ShieldCheck className="w-5 h-5" />
                        Seed My Certificates
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="divide-y divide-gray-50">
                    {registrations.filter(r => r.certificateIssued).map(reg => {
                      const webinar = webinars.find(w => w.id === reg.webinarId);
                      if (!webinar) return null;
                      return (
                        <div key={reg.id} className="p-8 flex items-center justify-between group">
                          <div className="flex items-center gap-6">
                            <div className="w-16 h-20 bg-blue-50 rounded-lg border-2 border-dashed border-blue-200 flex items-center justify-center relative">
                              <FileText className="w-8 h-8 text-blue-300" />
                              <div className="absolute -bottom-2 -right-2 w-8 h-8 bg-green-500 rounded-full flex items-center justify-center border-4 border-white">
                                <CheckCircle className="w-4 h-4 text-white" />
                              </div>
                            </div>
                            <div>
                              <h4 className="text-xl font-black text-gray-900 mb-1">{webinar.title}</h4>
                              <p className="text-sm text-gray-400 font-bold uppercase tracking-widest">
                                Issued on {format(reg.registeredAt.toDate(), 'PPP')}
                              </p>
                            </div>
                          </div>
                          <button 
                            onClick={async () => {
                              if (profile) {
                                const url = await generateCertificate(profile, webinar);
                                window.open(url, '_blank');
                              }
                            }}
                            className="flex items-center gap-3 px-6 py-3 bg-gray-50 text-gray-900 rounded-xl font-black text-sm hover:bg-blue-600 hover:text-white transition-all"
                          >
                            <Download className="w-5 h-5" />
                            Download PDF
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {activeTab === 'admin' && profile?.role === 'admin' && (
            <motion.div 
              key="admin"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-8"
            >
              <header className="flex items-center justify-between">
                <div>
                  <h2 className="text-4xl font-black text-gray-900 mb-2">Admin Console</h2>
                  <p className="text-gray-500 font-medium">Manage webinars and view system analytics.</p>
                </div>
                <div className="flex gap-4">
                  <button 
                    onClick={async () => {
                      if (profile) {
                        const sampleWebinar: Webinar = {
                          id: 'sample',
                          title: 'Admin Sample Certificate',
                          description: 'This is a sample certificate for demonstration purposes.',
                          provider: 'MediLearn Academy',
                          accreditationNumber: 'CPD-SAMPLE-001',
                          cpdPoints: 5,
                          startTime: Timestamp.now(),
                          durationMinutes: 60,
                          zoomLink: '',
                          price: 0,
                          quiz: []
                        };
                        const url = await generateCertificate(profile, sampleWebinar);
                        window.open(url, '_blank');
                      }
                    }}
                    className="px-6 py-3 bg-gray-100 text-gray-900 rounded-2xl font-black text-sm flex items-center gap-2 hover:bg-gray-200 transition-all"
                  >
                    <Download className="w-5 h-5" />
                    Sample PDF
                  </button>
                  <button 
                    onClick={() => {
                      setEditingWebinar(null);
                      setShowAdminForm(true);
                    }}
                    className="px-6 py-3 bg-blue-600 text-white rounded-2xl font-black text-sm flex items-center gap-2 hover:bg-blue-700 transition-all shadow-lg shadow-blue-100"
                  >
                    <Plus className="w-5 h-5" />
                    Add Webinar
                  </button>
                </div>
              </header>

              <div className="bg-white rounded-[2rem] shadow-sm border border-gray-100 overflow-hidden">
                <table className="w-full text-left">
                  <thead className="bg-gray-50 border-b border-gray-100">
                    <tr>
                      <th className="px-8 py-4 text-xs font-black text-gray-400 uppercase tracking-widest">Webinar</th>
                      <th className="px-8 py-4 text-xs font-black text-gray-400 uppercase tracking-widest">Points</th>
                      <th className="px-8 py-4 text-xs font-black text-gray-400 uppercase tracking-widest">Price</th>
                      <th className="px-8 py-4 text-xs font-black text-gray-400 uppercase tracking-widest">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {webinars.map(w => (
                      <tr key={w.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-8 py-6">
                          <p className="font-bold text-gray-900">{w.title}</p>
                          <p className="text-xs text-gray-400 font-medium">{w.provider}</p>
                        </td>
                        <td className="px-8 py-6 font-black text-blue-600">{w.cpdPoints} pts</td>
                        <td className="px-8 py-6 font-bold text-gray-600">{w.price ? `R${w.price}` : 'Free'}</td>
                        <td className="px-8 py-6">
                          <div className="flex gap-2">
                            <button 
                              onClick={() => {
                                setEditingWebinar(w);
                                setShowAdminForm(true);
                              }}
                              className="p-2 text-gray-400 hover:text-blue-600 transition-colors"
                            >
                              <Edit3 className="w-5 h-5" />
                            </button>
                            <button 
                              onClick={() => handleDeleteWebinar(w.id)}
                              className="p-2 text-gray-400 hover:text-red-600 transition-colors"
                            >
                              <Trash2 className="w-5 h-5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Profile Setup Modal */}
      <AnimatePresence>
        {showProfileSetup && (
          <div className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-white w-full max-w-md rounded-[2.5rem] p-10 shadow-2xl"
            >
              <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center mb-6">
                <UserIcon className="w-8 h-8 text-blue-600" />
              </div>
              <h3 className="text-2xl font-black text-gray-900 mb-2">Complete Your Profile</h3>
              <p className="text-gray-500 mb-8 font-medium">To issue accredited certificates, we need your SANC registration number.</p>
              
              <form onSubmit={(e) => {
                e.preventDefault();
                const sanc = (e.target as any).sanc.value;
                if (sanc) handleUpdateProfile(sanc);
              }}>
                <input 
                  name="sanc"
                  placeholder="SANC Registration Number" 
                  className="w-full px-6 py-4 bg-gray-50 border-2 border-gray-100 rounded-2xl mb-6 focus:border-blue-600 outline-none font-bold text-gray-700"
                  required
                />
                <button className="w-full py-4 bg-blue-600 text-white rounded-2xl font-black text-lg hover:bg-blue-700 transition-all">
                  Save & Continue
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Admin Webinar Form Modal */}
      <AnimatePresence>
        {showAdminForm && (
          <div className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-white w-full max-w-2xl rounded-[3rem] p-12 shadow-2xl overflow-y-auto max-h-[90vh]"
            >
              <h3 className="text-3xl font-black text-gray-900 mb-8">{editingWebinar ? 'Edit' : 'Add'} Webinar</h3>
              <form onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.target as HTMLFormElement);
                handleSaveWebinar({
                  title: formData.get('title') as string,
                  description: formData.get('description') as string,
                  provider: formData.get('provider') as string,
                  accreditationNumber: formData.get('accreditation') as string,
                  cpdPoints: Number(formData.get('points')),
                  price: Number(formData.get('price')),
                  durationMinutes: Number(formData.get('duration')),
                  zoomLink: formData.get('zoom') as string,
                });
              }} className="space-y-6">
                <div className="grid grid-cols-2 gap-6">
                  <div className="col-span-2">
                    <label className="text-xs font-black text-gray-400 uppercase tracking-widest mb-2 block">Title</label>
                    <input name="title" defaultValue={editingWebinar?.title} className="w-full px-6 py-4 bg-gray-50 rounded-2xl border-2 border-gray-100 focus:border-blue-600 outline-none font-bold" required />
                  </div>
                  <div className="col-span-2">
                    <label className="text-xs font-black text-gray-400 uppercase tracking-widest mb-2 block">Description</label>
                    <textarea name="description" defaultValue={editingWebinar?.description} className="w-full px-6 py-4 bg-gray-50 rounded-2xl border-2 border-gray-100 focus:border-blue-600 outline-none font-bold h-32" required />
                  </div>
                  <div>
                    <label className="text-xs font-black text-gray-400 uppercase tracking-widest mb-2 block">Provider</label>
                    <input name="provider" defaultValue={editingWebinar?.provider} className="w-full px-6 py-4 bg-gray-50 rounded-2xl border-2 border-gray-100 focus:border-blue-600 outline-none font-bold" required />
                  </div>
                  <div>
                    <label className="text-xs font-black text-gray-400 uppercase tracking-widest mb-2 block">Accreditation No.</label>
                    <input name="accreditation" defaultValue={editingWebinar?.accreditationNumber} className="w-full px-6 py-4 bg-gray-50 rounded-2xl border-2 border-gray-100 focus:border-blue-600 outline-none font-bold" required />
                  </div>
                  <div>
                    <label className="text-xs font-black text-gray-400 uppercase tracking-widest mb-2 block">CPD Points</label>
                    <input type="number" name="points" defaultValue={editingWebinar?.cpdPoints} className="w-full px-6 py-4 bg-gray-50 rounded-2xl border-2 border-gray-100 focus:border-blue-600 outline-none font-bold" required />
                  </div>
                  <div>
                    <label className="text-xs font-black text-gray-400 uppercase tracking-widest mb-2 block">Price (ZAR)</label>
                    <input type="number" name="price" defaultValue={editingWebinar?.price} className="w-full px-6 py-4 bg-gray-50 rounded-2xl border-2 border-gray-100 focus:border-blue-600 outline-none font-bold" />
                  </div>
                  <div>
                    <label className="text-xs font-black text-gray-400 uppercase tracking-widest mb-2 block">Duration (min)</label>
                    <input type="number" name="duration" defaultValue={editingWebinar?.durationMinutes} className="w-full px-6 py-4 bg-gray-50 rounded-2xl border-2 border-gray-100 focus:border-blue-600 outline-none font-bold" required />
                  </div>
                  <div>
                    <label className="text-xs font-black text-gray-400 uppercase tracking-widest mb-2 block">Zoom Link</label>
                    <input name="zoom" defaultValue={editingWebinar?.zoomLink} className="w-full px-6 py-4 bg-gray-50 rounded-2xl border-2 border-gray-100 focus:border-blue-600 outline-none font-bold" required />
                  </div>
                </div>
                <div className="flex gap-4 pt-6">
                  <button type="button" onClick={() => setShowAdminForm(false)} className="flex-1 py-4 bg-gray-100 text-gray-600 rounded-2xl font-black text-lg hover:bg-gray-200 transition-all">Cancel</button>
                  <button className="flex-2 py-4 bg-blue-600 text-white rounded-2xl font-black text-lg hover:bg-blue-700 transition-all">Save Webinar</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Webinar Player Modal */}
      <AnimatePresence>
        {selectedWebinar && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/90 backdrop-blur-xl flex items-center justify-center p-8"
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white w-full max-w-5xl rounded-[3rem] overflow-hidden shadow-2xl flex flex-col h-[85vh]"
            >
              <div className="p-8 bg-gray-900 text-white flex items-center justify-between">
                <div>
                  <h3 className="text-2xl font-black">{selectedWebinar.title}</h3>
                  <p className="text-gray-400 text-sm font-bold uppercase tracking-widest">{selectedWebinar.provider}</p>
                </div>
                <button 
                  onClick={() => {
                    setSelectedWebinar(null);
                    setQuizMode(false);
                    setIsWatching(false);
                    setWatchTime(0);
                  }}
                  className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors"
                >
                  <LogOut className="w-6 h-6 rotate-180" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-12">
                {!quizMode ? (
                  <div className="max-w-3xl mx-auto space-y-12">
                    <div 
                      onClick={() => setIsWatching(true)}
                      className="aspect-video bg-gray-100 rounded-[2rem] flex flex-col items-center justify-center border-4 border-dashed border-gray-200 group cursor-pointer hover:border-blue-400 transition-colors relative overflow-hidden"
                    >
                      {isWatching ? (
                        <div className="absolute inset-0 bg-black flex flex-col items-center justify-center">
                          <div className="w-20 h-20 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-6" />
                          <p className="text-white font-black text-xl">Streaming Live Content...</p>
                          <p className="text-blue-400 font-bold mt-2">Time Watched: {Math.floor(watchTime / 60)}m {watchTime % 60}s</p>
                        </div>
                      ) : (
                        <>
                          <div className="w-24 h-24 bg-blue-600 rounded-full flex items-center justify-center shadow-xl shadow-blue-200 group-hover:scale-110 transition-transform">
                            <Play className="w-10 h-10 text-white fill-current ml-1" />
                          </div>
                          <p className="mt-8 text-xl font-black text-gray-900">Watch Live Webinar Stream</p>
                          <p className="text-gray-400 font-bold mt-2">Attendance is being tracked automatically</p>
                        </>
                      )}
                    </div>

                    <div className="bg-blue-50 p-8 rounded-3xl border border-blue-100">
                      <h4 className="text-xl font-black text-blue-900 mb-4">Learning Objectives</h4>
                      <ul className="space-y-3">
                        {['Understand core concepts', 'Apply clinical reasoning', 'Identify best practices'].map((obj, i) => (
                          <li key={i} className="flex items-center gap-3 text-blue-800 font-medium">
                            <div className="w-2 h-2 bg-blue-400 rounded-full" />
                            {obj}
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="flex flex-col items-center gap-4">
                      {watchTime < 10 ? ( // Demo: only 10 seconds needed
                        <div className="flex items-center gap-2 text-gray-400 font-bold">
                          <Lock className="w-5 h-5" />
                          Watch for 10 seconds to unlock assessment
                        </div>
                      ) : (
                        <button 
                          onClick={() => setQuizMode(true)}
                          className="w-full py-6 bg-blue-600 text-white rounded-3xl font-black text-xl hover:bg-blue-700 transition-all shadow-xl shadow-blue-100"
                        >
                          Proceed to Assessment
                        </button>
                      )}
                    </div>
                  </div>
                ) : (
                  <QuizModule 
                    questions={selectedWebinar.quiz} 
                    onComplete={(score) => handleCompleteQuiz(selectedWebinar, score)} 
                  />
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// --- Quiz Component ---
const QuizModule = ({ questions, onComplete }: { questions: QuizQuestion[]; onComplete: (score: number) => void }) => {
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState<number[]>([]);
  const [finished, setFinished] = useState(false);

  const handleAnswer = (idx: number) => {
    const newAnswers = [...answers];
    newAnswers[currentIdx] = idx;
    setAnswers(newAnswers);

    if (currentIdx < questions.length - 1) {
      setCurrentIdx(prev => prev + 1);
    } else {
      setFinished(true);
    }
  };

  if (finished) {
    const correctCount = answers.reduce((acc, ans, idx) => acc + (ans === questions[idx].correctAnswer ? 1 : 0), 0);
    const score = Math.round((correctCount / questions.length) * 100);
    const passed = score >= 80;

    return (
      <div className="max-w-xl mx-auto text-center py-12">
        <div className={cn(
          "w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-8 shadow-xl",
          passed ? "bg-green-100 text-green-600" : "bg-red-100 text-red-600"
        )}>
          {passed ? <CheckCircle className="w-12 h-12" /> : <AlertCircle className="w-12 h-12" />}
        </div>
        <h3 className="text-4xl font-black text-gray-900 mb-2">{score}% Score</h3>
        <p className="text-xl font-bold text-gray-500 mb-10">
          {passed ? "Congratulations! You've passed the assessment." : "You didn't reach the 80% pass mark. Please review and try again."}
        </p>
        <button 
          onClick={() => onComplete(score)}
          className="w-full py-5 bg-gray-900 text-white rounded-2xl font-black text-lg hover:bg-black transition-all"
        >
          {passed ? "Claim CPD Points" : "Return to Dashboard"}
        </button>
      </div>
    );
  }

  const q = questions[currentIdx];
  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-12">
        <span className="text-xs font-black text-blue-600 uppercase tracking-widest bg-blue-50 px-4 py-2 rounded-full">
          Question {currentIdx + 1} of {questions.length}
        </span>
        <div className="w-48 bg-gray-100 h-2 rounded-full overflow-hidden">
          <div 
            className="bg-blue-600 h-full transition-all duration-300" 
            style={{ width: `${((currentIdx + 1) / questions.length) * 100}%` }} 
          />
        </div>
      </div>

      <h3 className="text-3xl font-black text-gray-900 mb-10 leading-tight">{q.question}</h3>
      
      <div className="space-y-4">
        {q.options.map((opt, i) => (
          <button
            key={i}
            onClick={() => handleAnswer(i)}
            className="w-full p-6 text-left bg-white border-2 border-gray-100 rounded-3xl font-bold text-gray-700 hover:border-blue-600 hover:bg-blue-50 transition-all group flex items-center justify-between"
          >
            {opt}
            <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-blue-600" />
          </button>
        ))}
      </div>
    </div>
  );
};
