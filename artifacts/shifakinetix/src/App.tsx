import { useMemo, useState, type ComponentType, type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import NotFound from '@/pages/not-found';
import { useLocation } from 'wouter';
import {
  Activity, AlertCircle, ArrowLeft, ArrowRight, BadgeCheck, Bell, Brain,
  CalendarDays, Check, CheckCircle2, ChevronDown, ClipboardCheck, Clock3,
  FileCheck2, FileText, HeartPulse, Image, Info, LayoutDashboard, LockKeyhole,
  MessageSquare, MoreHorizontal, Move3d, PanelsTopLeft, Pill, Play, Plus,
  RefreshCw, Search, Send, Settings2, ShieldCheck, Sparkles, Stethoscope,
  SunMedium, UserRound, UsersRound, Video, WalletCards, X, Zap, ShieldAlert,
  Compass, Eye, CheckSquare, Layers, UploadCloud, HelpCircle
} from 'lucide-react';

const queryClient = new QueryClient();
type Role = 'patient' | 'doctor' | 'physio';
type IconType = ComponentType<{
  size?: number;
  className?: string;
  strokeWidth?: number;
}>;

type MuscleCandidate = {
  name: string;
  latinName: string;
  depth: 'Superficial' | 'Intermediate' | 'Deep';
  confidence: number;
  matchCriteria: string[];
};

type LabReportItem = {
  id: string;
  name: string;
  fileName: string;
  uploadDate: string;
  summary: string;
  status: 'Pending Doctor Review' | 'Approved by Doctor';
};

type ConsultationState = {
  region: string;
  taxonomy: string;
  point: string;
  view: 'anterior' | 'posterior';
  mode: 'A' | 'B';
  depth: 'Superficial' | 'Deep';
  candidateMuscles: MuscleCandidate[];
  muscleSpecificAnswers: Record<string, string>;
  deepeningAnswers: Record<string, string>;
  secondRedFlagAnswers: Record<string, string>;
  dietState: 'AI_SUGGESTED' | 'PATIENT_ACCEPTED' | 'SENT_FOR_REVIEW' | 'DOCTOR_APPROVED';
  reportSentToDoctor: boolean;
  followUpStatus: 'stable' | 'improving' | 'worse' | 'pending';
  followUpNote: string;
  escalatedToAppointment: boolean;
  labReports: LabReportItem[];
};

const defaultConsultation: ConsultationState = {
  region: 'Lower Back (Lumbar)',
  taxonomy: 'MSK.BACK.LOWER',
  point: 'L4-L5 Lumbar Spine · 74%, 46%',
  view: 'posterior',
  mode: 'A',
  depth: 'Deep',
  candidateMuscles: [
    { name: 'Erector Spinae', latinName: 'Longissimus thoracis', depth: 'Intermediate', confidence: 91, matchCriteria: ['Spinal loading tenderness', 'Pain upon extension'] },
    { name: 'Quadratus Lumborum', latinName: 'M. quadratus lumborum', depth: 'Deep', confidence: 82, matchCriteria: ['Lateral pelvic referral', 'Pain on lateral flexion'] },
    { name: 'Multifidus', latinName: 'Mm. multifidi lumborum', depth: 'Deep', confidence: 68, matchCriteria: ['Segmental vertebral load tenderness'] }
  ],
  muscleSpecificAnswers: {
    'Does the lower back ache radiate down below the knee into your calf or foot?': 'no',
    'Is there any numbness or tingling in your groin or saddle area?': 'no',
    'Is the pain relieved when resting in a curled-up or bent-forward position?': 'yes'
  },
  deepeningAnswers: {
    'Duration': '3 to 5 days',
    'Aggravating factor': 'Prolonged sitting & standing up from low chairs',
    'Relieving factor': 'Gentle walking and heat pack'
  },
  secondRedFlagAnswers: {
    'Did you develop sudden unexplained muscle twitching or weakness?': 'no',
    'Are you experiencing sudden fever, night sweats or severe chills?': 'no'
  },
  dietState: 'AI_SUGGESTED',
  reportSentToDoctor: true,
  followUpStatus: 'improving',
  followUpNote: '24-hour check: stiffness decreased after morning gentle pelvic tilts.',
  escalatedToAppointment: false,
  labReports: [
    {
      id: 'LAB-001',
      name: 'Lumbosacral X-Ray Report',
      fileName: 'lumbar_xray_report.pdf',
      uploadDate: 'Today, 10:20 AM',
      summary: 'Mild L4-L5 disc space narrowing without acute bony fracture or spondylolisthesis.',
      status: 'Approved by Doctor'
    }
  ]
};

const navByRole: Record<Role, { label: string; href: string; icon: IconType }[]> = {
  patient: [
    { label: 'Home', href: '/', icon: LayoutDashboard },
    { label: 'Report Symptom', href: '/intake', icon: AlertCircle },
    { label: 'My Care & Chat', href: '/thread', icon: MessageSquare },
    { label: '24h Follow-up', href: '/follow-up', icon: RefreshCw },
    { label: 'Appointments', href: '/booking', icon: CalendarDays },
  ],
  doctor: [
    { label: 'Doctor Dashboard', href: '/doctor', icon: LayoutDashboard },
    { label: 'Consultation Thread', href: '/thread', icon: MessageSquare },
    { label: 'Verification', href: '/verification', icon: BadgeCheck },
  ],
  physio: [
    { label: 'Physio Care Board', href: '/physio', icon: LayoutDashboard },
    { label: 'Sessions & Feedback', href: '/thread', icon: UsersRound },
  ],
};

function Badge({ children, tone = 'neutral' }: { children: ReactNode; tone?: 'neutral' | 'teal' | 'lime' | 'coral' | 'navy' }) {
  const tones = {
    neutral: 'bg-muted text-muted-foreground',
    teal: 'bg-primary/10 text-primary',
    lime: 'bg-accent text-accent-foreground',
    coral: 'bg-destructive/10 text-destructive',
    navy: 'bg-sidebar/10 text-sidebar',
  };
  return <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold tracking-wide ${tones[tone]}`}>{children}</span>;
}

function Button({ children, onClick, variant = 'primary', icon: Icon, disabled = false, className = '', type = 'button', testId }: {
  children: ReactNode; onClick?: () => void; variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'dark'; icon?: IconType; disabled?: boolean; className?: string; type?: 'button' | 'submit'; testId?: string;
}) {
  const styles = {
    primary: 'bg-primary text-primary-foreground hover:brightness-105 shadow-sm',
    secondary: 'bg-card text-foreground border border-border hover:bg-muted/70',
    ghost: 'text-muted-foreground hover:bg-muted hover:text-foreground',
    danger: 'bg-destructive text-destructive-foreground hover:brightness-105',
    dark: 'bg-sidebar text-sidebar-foreground hover:bg-sidebar/90',
  };
  return <button type={type} disabled={disabled} onClick={onClick} data-testid={testId} className={`inline-flex min-h-12 items-center justify-center gap-2 rounded-xl px-5 text-sm font-bold transition-all duration-150 active:scale-[.98] disabled:cursor-not-allowed disabled:opacity-50 ${styles[variant]} ${className}`}>
    {Icon && <Icon size={18} strokeWidth={2.3} />}{children}
  </button>;
}

function Panel({ children, className = '', accent = false }: { children: ReactNode; className?: string; accent?: boolean }) {
  return <section className={`rounded-2xl border bg-card p-6 md:p-8 shadow-clinic ${accent ? 'border-primary/30 ring-1 ring-primary/10' : 'border-card-border'} ${className}`}>{children}</section>;
}

function SectionLabel({ children }: { children: ReactNode }) {
  return <div className="mb-2.5 flex items-center gap-2 font-mono text-xs font-bold uppercase tracking-[.14em] text-primary">{children}</div>;
}

function StatusDot({ color = 'teal' }: { color?: 'teal' | 'coral' | 'lime' }) {
  const c = { teal: 'bg-primary', coral: 'bg-destructive', lime: 'bg-[#9aa92c]' };
  return <span className={`pulse-dot inline-block h-2.5 w-2.5 rounded-full ${c[color]}`} />;
}

function Shell({ role, setRole, children }: { role: Role; setRole: (role: Role) => void; children: ReactNode }) {
  const [location, setLocation] = useLocation();
  const items = navByRole[role];
  return <div className="min-h-[100dvh] bg-background">
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-[260px] flex-col bg-sidebar px-4 py-6 text-sidebar-foreground lg:flex">
      <div className="mb-8 flex items-center gap-3 px-3">
        <div className="grid h-11 w-11 place-items-center rounded-xl bg-sidebar-primary text-sidebar-primary-foreground shadow-sm"><Activity size={24} strokeWidth={2.5} /></div>
        <div>
          <div className="text-lg font-bold tracking-tight">Shifa<span className="text-sidebar-primary">Kinetix</span></div>
          <div className="font-mono text-[9px] uppercase tracking-[.2em] opacity-60">Care Platform</div>
        </div>
      </div>
      <div className="mb-6 rounded-xl border border-sidebar-border bg-sidebar-accent/50 p-3.5">
        <div className="mb-2 flex items-center justify-between"><span className="font-mono text-[10px] uppercase tracking-[.14em] opacity-70">Demo User Role</span><Zap size={14} className="text-sidebar-primary" /></div>
        <select data-testid="select-demo-role" value={role} onChange={e => { const next = e.target.value as Role; setRole(next); setLocation(next === 'patient' ? '/' : next === 'doctor' ? '/doctor' : '/physio'); }} className="w-full cursor-pointer rounded-lg bg-sidebar-accent px-2.5 py-1.5 text-sm font-semibold outline-none">
          <option className="bg-sidebar text-white" value="patient">Patient · Aisha Rahman</option>
          <option className="bg-sidebar text-white" value="doctor">Doctor · Dr. Maya Chen</option>
          <option className="bg-sidebar text-white" value="physio">Physio · Leo Martins</option>
        </select>
      </div>
      <nav className="space-y-1.5">
        {items.map(item => {
          const Icon = item.icon;
          const active = location === item.href || (item.href !== '/' && location.startsWith(item.href));
          return <button key={item.href} data-testid={`nav-${item.label.toLowerCase().replaceAll(' ', '-')}`} onClick={() => setLocation(item.href)} className={`flex w-full items-center gap-3.5 rounded-xl px-4 py-3 text-left text-sm font-semibold transition-colors ${active ? 'bg-sidebar-primary text-sidebar-primary-foreground font-bold shadow-sm' : 'text-sidebar-foreground/75 hover:bg-sidebar-accent hover:text-sidebar-foreground'}`}><Icon size={19} />{item.label}</button>;
        })}
      </nav>
      <div className="mt-auto">
        <div className="rounded-xl border border-sidebar-border bg-sidebar-accent/40 p-3.5">
          <div className="flex items-center gap-2 text-xs font-bold text-sidebar-primary">
            <ShieldCheck size={16} /> Clinical Red-Flag Engine
          </div>
          <p className="mt-1 text-[11px] leading-relaxed opacity-75">All symptoms screened safely before doctor routing.</p>
        </div>
      </div>
    </aside>
    <div className="lg:pl-[260px]">
      <header className="sticky top-0 z-20 flex h-[72px] items-center justify-between border-b border-border/80 bg-background/95 px-5 backdrop-blur-md md:px-8">
        <div className="flex items-center gap-3 lg:hidden"><div className="grid h-9 w-9 place-items-center rounded-lg bg-sidebar text-sidebar-primary"><Activity size={20} /></div><span className="font-bold text-base">Shifa<span className="text-primary">Kinetix</span></span></div>
        <div className="hidden items-center gap-2 text-sm text-muted-foreground lg:flex"><span>Portal</span><span>/</span><span className="font-bold capitalize text-foreground">{role} View</span></div>
        <div className="ml-auto flex items-center gap-3">
          <div className="rounded-full bg-accent/70 px-3.5 py-1.5 font-mono text-[11px] font-bold uppercase tracking-wide text-accent-foreground">
            Clear Care Navigation
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-[1240px] px-5 py-8 md:px-8 md:py-10">{children}</main>
    </div>
  </div>;
}

function PageHeader({ eyebrow, title, detail, action }: { eyebrow: string; title: ReactNode; detail: string; action?: ReactNode }) {
  return <div className="mb-8 flex flex-col justify-between gap-4 md:flex-row md:items-end">
    <div>
      <div className="mb-1.5 font-mono text-xs font-bold uppercase tracking-[.18em] text-primary">{eyebrow}</div>
      <h1 className="text-balance text-2xl font-bold tracking-tight text-foreground sm:text-3xl md:text-4xl">{title}</h1>
      <p className="mt-2 max-w-2xl text-base leading-relaxed text-muted-foreground">{detail}</p>
    </div>
    {action && <div className="shrink-0">{action}</div>}
  </div>;
}

function Metric({ label, value, note, icon: Icon, tone = 'teal' }: { label: string; value: string; note: string; icon: IconType; tone?: 'teal' | 'coral' | 'lime' }) {
  return <Panel className="p-5">
    <div className="mb-3 flex items-start justify-between">
      <span className="font-mono text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</span>
      <div className={`grid h-9 w-9 place-items-center rounded-xl ${tone === 'coral' ? 'bg-destructive/10 text-destructive' : tone === 'lime' ? 'bg-accent text-accent-foreground' : 'bg-primary/10 text-primary'}`}>
        <Icon size={17} />
      </div>
    </div>
    <div className="text-2xl font-bold tracking-tight">{value}</div>
    <div className="mt-1 text-xs text-muted-foreground">{note}</div>
  </Panel>;
}

/* -------------------------------------------------------------
   ANATOMICAL REGIONS & MUSCLE-SPECIFIC RED-FLAG QUESTIONS
-------------------------------------------------------------- */
interface AnatomicalRegion {
  name: string;
  latinName: string;
  view: 'anterior' | 'posterior';
  taxonomy: string;
  point: string;
  topPct: number;
  leftPct: number;
  description: string;
  muscleQuestions: string[];
  candidates: MuscleCandidate[];
}

const anatomicalRegions: AnatomicalRegion[] = [
  {
    name: 'Neck & Trapezius',
    latinName: 'M. trapezius / Splenius capitis',
    view: 'posterior',
    taxonomy: 'MSK.CERVICAL.01',
    point: 'C4-C7 Trapezius · 22%, 73%',
    topPct: 22,
    leftPct: 73,
    description: 'Cervical paraspinals, upper trapezius ridge, levator scapulae',
    muscleQuestions: [
      'Does pain shoot down through your shoulder into your fingers or hand?',
      'Do you have any difficulty keeping your balance or walking normally?',
      'Did this neck pain begin after a sudden whip, vehicle crash, or blow to the head?'
    ],
    candidates: [
      { name: 'Upper Trapezius', latinName: 'M. trapezius pars descendens', depth: 'Superficial', confidence: 93, matchCriteria: ['Cervicothoracic angle palpation', 'Exacerbated by shoulder shrug'] },
      { name: 'Levator Scapulae', latinName: 'M. levator scapulae', depth: 'Intermediate', confidence: 81, matchCriteria: ['Superior scapular angle pain', 'Restricted rotation'] },
      { name: 'Splenius Capitis', latinName: 'M. splenius capitis', depth: 'Deep', confidence: 64, matchCriteria: ['Deep suboccipital tension'] }
    ]
  },
  {
    name: 'Shoulder (Rotator Cuff)',
    latinName: 'M. supraspinatus & deltoideus',
    view: 'anterior',
    taxonomy: 'MSK.SHOULDER.02',
    point: 'R Glenohumeral · 27%, 23%',
    topPct: 27,
    leftPct: 23,
    description: 'Rotator cuff complex: supraspinatus, infraspinatus, deltoid',
    muscleQuestions: [
      'Is there severe pain when raising your arm above head level (between 60° and 120°)?',
      'Did you feel a sudden snap, tear, or immediate inability to lift the arm?',
      'Are you experiencing any chest heaviness, shortness of breath, or cold sweats?'
    ],
    candidates: [
      { name: 'Supraspinatus Tendon', latinName: 'M. supraspinatus', depth: 'Intermediate', confidence: 95, matchCriteria: ['Painful arc (60-120°)', 'Empty-can test match', 'Subacromial tenderness'] },
      { name: 'Infraspinatus', latinName: 'M. infraspinatus', depth: 'Intermediate', confidence: 78, matchCriteria: ['Weakness during resisted external rotation'] },
      { name: 'Deltoid (Anterior)', latinName: 'M. deltoideus', depth: 'Superficial', confidence: 65, matchCriteria: ['Surface palpation tenderness'] }
    ]
  },
  {
    name: 'Lower Back (Lumbar)',
    latinName: 'Erector spinae / M. quadratus lumborum',
    view: 'posterior',
    taxonomy: 'MSK.BACK.LOWER',
    point: 'L4-L5 Paraspinal · 46%, 74%',
    topPct: 46,
    leftPct: 74,
    description: 'Lumbar paraspinals, erector spinae, multifidus, quadratus lumborum',
    muscleQuestions: [
      'Does pain shoot down your leg past the knee with numbness or foot weakness?',
      'Have you noticed any new loss of bladder or bowel control, or numbness in the groin?',
      'Did this begin after a fall, high-impact injury, or with high fever/chills?'
    ],
    candidates: [
      { name: 'Erector Spinae', latinName: 'Longissimus thoracis', depth: 'Intermediate', confidence: 91, matchCriteria: ['Paraspinal palpation match', 'Worse upon extension', 'No foot drop'] },
      { name: 'Quadratus Lumborum', latinName: 'M. quadratus lumborum', depth: 'Deep', confidence: 82, matchCriteria: ['Lateral pelvic referral', 'Pain on lateral bend'] },
      { name: 'Multifidus', latinName: 'Mm. multifidi', depth: 'Deep', confidence: 68, matchCriteria: ['Segmental vertebral load tenderness'] }
    ]
  },
  {
    name: 'Knee (Quadriceps & Patella)',
    latinName: 'M. quadriceps femoris / Patellar tendon',
    view: 'anterior',
    taxonomy: 'MSK.KNEE.01',
    point: 'R Patellar Zone · 68%, 23%',
    topPct: 68,
    leftPct: 23,
    description: 'Quadriceps femoris tendon, patellar tendon, vastus medialis',
    muscleQuestions: [
      'Is the knee locked and physically unable to bend or fully straighten?',
      'Did you hear or feel a loud pop followed by rapid large swelling within 2 hours?',
      'Are you completely unable to bear weight or take 4 steps on this leg?'
    ],
    candidates: [
      { name: 'Patellar Tendon', latinName: 'Ligamentum patellae', depth: 'Superficial', confidence: 93, matchCriteria: ['Inferior patella tenderness', 'Pain on stairs descent'] },
      { name: 'Vastus Medialis Oblique (VMO)', latinName: 'M. vastus medialis', depth: 'Superficial', confidence: 84, matchCriteria: ['Anteromedial peripatellar ache'] },
      { name: 'Rectus Femoris', latinName: 'M. rectus femoris', depth: 'Intermediate', confidence: 71, matchCriteria: ['Terminal knee extension discomfort'] }
    ]
  },
  {
    name: 'Hamstring & Calf',
    latinName: 'M. biceps femoris / Gastrocnemius',
    view: 'posterior',
    taxonomy: 'MSK.LEG.POSTERIOR',
    point: 'Biceps Femoris / Gastrocnemius · 72%, 78%',
    topPct: 72,
    leftPct: 78,
    description: 'Hamstring group, semitendinosus, gastrocnemius, Achilles',
    muscleQuestions: [
      'Is one calf significantly swollen, red, and warm to the touch (possible blood clot)?',
      'Did it feel like you were hit in the back of the ankle with immediate weakness?',
      'Is there total loss of sensation in your foot or toes?'
    ],
    candidates: [
      { name: 'Biceps Femoris (Hamstring)', latinName: 'M. biceps femoris', depth: 'Intermediate', confidence: 90, matchCriteria: ['Ischial origin tenderness', 'Pain on terminal knee extension'] },
      { name: 'Medial Gastrocnemius', latinName: 'M. gastrocnemius', depth: 'Superficial', confidence: 82, matchCriteria: ['Mid-belly calf tenderness with heel raise'] }
    ]
  },
  {
    name: 'Ankle & Foot',
    latinName: 'Tibialis anterior & Peroneal tendons',
    view: 'anterior',
    taxonomy: 'MSK.FOOT.01',
    point: 'Anterior Tibiotalar · 88%, 24%',
    topPct: 88,
    leftPct: 24,
    description: 'Tibialis anterior, lateral ligaments, Achilles insertion',
    muscleQuestions: [
      'Are you completely unable to take four steps immediately after the injury (Ottawa Rule)?',
      'Is there direct bone tenderness right over the malleolus (ankle bone) or 5th metatarsal?',
      'Is your foot pale, cold, or lacking a pulse compared to the other side?'
    ],
    candidates: [
      { name: 'Tibialis Anterior Tendon', latinName: 'M. tibialis anterior', depth: 'Superficial', confidence: 88, matchCriteria: ['Pain on resisted dorsiflexion'] },
      { name: 'Peroneus Longus / Brevis', latinName: 'Mm. peronei', depth: 'Superficial', confidence: 79, matchCriteria: ['Lateral retromalleolar tenderness'] }
    ]
  }
];

/* -------------------------------------------------------------
   PATIENT INTAKE FLOW (UNCLUTTERED, PROGRESSIVE STEP-BY-STEP)
-------------------------------------------------------------- */
function IntakePage({
  setLocation,
  onSave
}: {
  setLocation: (path: string) => void;
  onSave: (state: ConsultationState) => void;
}) {
  const [step, setStep] = useState(1);
  const [selectedRegion, setSelectedRegion] = useState<AnatomicalRegion>(anatomicalRegions[2]); // Lower back
  const [depth, setDepth] = useState<'Superficial' | 'Deep'>('Deep');
  const [muscleAnswers, setMuscleAnswers] = useState<Record<string, string>>({});
  
  // AI Cross-questioning state
  const [aiQuestions, setAiQuestions] = useState({
    onset: '3 to 5 days ago, after lifting heavy groceries',
    movementPain: 'Hurts most when sitting for over 20 minutes and bending forward',
    relief: 'Gentle walking and warmth provide mild temporary relief'
  });

  // Second Red-flag screening in chat
  const [secondRedFlags, setSecondRedFlags] = useState<Record<string, string>>({});
  const [dietDecision, setDietDecision] = useState<'AI_SUGGESTED' | 'PATIENT_ACCEPTED' | 'SENT_FOR_REVIEW'>('AI_SUGGESTED');
  const [reportSent, setReportSent] = useState(false);

  // Check if first muscle-specific questions flag an acute condition
  const isAcuteFirst = Object.values(muscleAnswers).some(val => val === 'yes' || val === 'unsure');
  const allFirstAnswered = selectedRegion.muscleQuestions.every(q => muscleAnswers[q]);

  // Second red flag questions
  const secondQuestions = [
    'Did you develop sudden unexplained muscle twitching or weakness?',
    'Are you experiencing sudden fever, night sweats or severe chills?'
  ];
  const allSecondAnswered = secondQuestions.every(q => secondRedFlags[q]);
  const isAcuteSecond = Object.values(secondRedFlags).some(val => val === 'yes' || val === 'unsure');

  const handleFinishAndSave = (routeTo: string) => {
    onSave({
      region: selectedRegion.name,
      taxonomy: selectedRegion.taxonomy,
      point: selectedRegion.point,
      view: selectedRegion.view,
      mode: 'A',
      depth,
      candidateMuscles: selectedRegion.candidates,
      muscleSpecificAnswers: muscleAnswers,
      deepeningAnswers: {
        'Onset & Cause': aiQuestions.onset,
        'Aggravating factor': aiQuestions.movementPain,
        'Relieving factor': aiQuestions.relief
      },
      secondRedFlagAnswers: secondRedFlags,
      dietState: dietDecision,
      reportSentToDoctor: reportSent || true,
      followUpStatus: 'pending',
      followUpNote: 'Scheduled for 24-hour follow-up check.',
      escalatedToAppointment: routeTo === '/booking',
      labReports: [
        {
          id: 'LAB-001',
          name: 'Lumbosacral X-Ray Report',
          fileName: 'lumbar_xray_report.pdf',
          uploadDate: 'Today',
          summary: 'Mild L4-L5 disc space narrowing without acute bony fracture.',
          status: 'Approved by Doctor'
        }
      ]
    });
    setLocation(routeTo);
  };

  return (
    <div className="mx-auto max-w-4xl animate-rise space-y-6">
      <button
        onClick={() => setLocation('/')}
        className="inline-flex items-center gap-2 text-sm font-bold text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft size={16} /> Back to Home
      </button>

      {/* Clear, Accessible Step Tracker */}
      <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
        <div className="flex items-center justify-between text-xs font-bold text-muted-foreground mb-2">
          <span>Step {step} of 4</span>
          <span className="text-primary font-bold">
            {step === 1 ? '1. Pinpoint Muscle' : step === 2 ? '2. Muscle Safety Check' : step === 3 ? '3. AI Deepening & Care Plan' : '4. Safety Recheck & Doctor Option'}
          </span>
        </div>
        <div className="grid grid-cols-4 gap-2">
          {[1, 2, 3, 4].map(s => (
            <div
              key={s}
              className={`h-2.5 rounded-full transition-all ${
                step >= s ? 'bg-primary' : 'bg-muted'
              }`}
            />
          ))}
        </div>
      </div>

      {/* STEP 1: PINPOINT ON 3D / MUSCULAR MODEL */}
      {step === 1 && (
        <Panel className="space-y-6">
          <div>
            <SectionLabel><Layers size={14} /> Step 1 · Muscle Pinpoint</SectionLabel>
            <h2 className="text-2xl font-bold tracking-tight">Tap Where You Feel Discomfort</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Select your affected muscle area on the body illustration below.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-[1.1fr_.9fr]">
            {/* Interactive Anatomical Body Map */}
            <div className="relative mx-auto w-full max-w-[380px] overflow-hidden rounded-2xl border border-primary/20 bg-card shadow-sm">
              <img
                src="/muscular_anatomy_body.jpg"
                alt="Human Muscular System"
                className="h-auto w-full object-cover select-none"
              />

              {anatomicalRegions.map(reg => {
                const isSelected = reg.name === selectedRegion.name;
                return (
                  <button
                    key={reg.name}
                    type="button"
                    onClick={() => setSelectedRegion(reg)}
                    style={{ top: `${reg.topPct}%`, left: `${reg.leftPct}%` }}
                    className={`group absolute -translate-x-1/2 -translate-y-1/2 rounded-full p-1.5 transition-all ${
                      isSelected ? 'z-20 scale-125' : 'z-10 hover:scale-115'
                    }`}
                  >
                    <span className={`flex h-7 w-7 items-center justify-center rounded-full border-2 text-xs font-bold shadow-md ${
                      isSelected
                        ? 'border-white bg-destructive text-white ring-4 ring-destructive/30'
                        : 'border-white bg-primary text-white hover:bg-primary/90'
                    }`}>
                      {isSelected ? '●' : '+'}
                    </span>
                    <span className={`absolute left-1/2 top-full mt-1 -translate-x-1/2 whitespace-nowrap rounded-md px-2 py-0.5 text-[11px] font-bold shadow-sm ${
                      isSelected ? 'bg-foreground text-background opacity-100' : 'opacity-0 group-hover:opacity-100 bg-background/90 text-foreground'
                    }`}>
                      {reg.name}
                    </span>
                  </button>
                );
              })}

              <div className="absolute bottom-2 inset-x-2 flex justify-between rounded-lg bg-background/90 px-3 py-1 text-[11px] font-bold">
                <span>← Anterior (Front)</span>
                <span>Posterior (Back) →</span>
              </div>
            </div>

            {/* Selection Details & Depth */}
            <div className="flex flex-col justify-between space-y-4">
              <div className="rounded-xl border border-primary/25 bg-primary/5 p-5">
                <span className="font-mono text-xs font-bold uppercase text-primary">Selected Muscle Zone</span>
                <h3 className="mt-1 text-2xl font-bold text-foreground">{selectedRegion.name}</h3>
                <p className="font-mono text-xs text-muted-foreground">{selectedRegion.latinName}</p>
                <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{selectedRegion.description}</p>

                <div className="mt-4 border-t border-primary/15 pt-3">
                  <label className="block text-xs font-bold uppercase text-muted-foreground mb-2">Tissue Depth Layer</label>
                  <div className="grid grid-cols-2 gap-2">
                    {(['Superficial', 'Deep'] as const).map(d => (
                      <button
                        key={d}
                        type="button"
                        onClick={() => setDepth(d)}
                        className={`rounded-xl border p-2.5 text-center text-xs font-bold transition-all ${
                          depth === d
                            ? 'border-primary bg-primary text-primary-foreground shadow-sm'
                            : 'border-border bg-card text-foreground hover:bg-muted'
                        }`}
                      >
                        {d} Layer
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div>
                <span className="block text-xs font-bold text-muted-foreground mb-2 uppercase">Or Quick Select:</span>
                <div className="grid grid-cols-2 gap-1.5">
                  {anatomicalRegions.map(reg => (
                    <button
                      key={reg.name}
                      type="button"
                      onClick={() => setSelectedRegion(reg)}
                      className={`rounded-lg border p-2 text-left text-xs font-semibold ${
                        reg.name === selectedRegion.name
                          ? 'border-primary bg-primary/10 text-primary font-bold'
                          : 'border-border bg-card text-muted-foreground hover:bg-muted'
                      }`}
                    >
                      {reg.name}
                    </button>
                  ))}
                </div>
              </div>

              <Button onClick={() => setStep(2)} icon={ArrowRight} testId="button-step1-continue" className="w-full">
                Continue with {selectedRegion.name}
              </Button>
            </div>
          </div>
        </Panel>
      )}

      {/* STEP 2: MUSCLE-SPECIFIC RED-FLAG QUESTIONS */}
      {step === 2 && (
        <Panel className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <SectionLabel><ShieldCheck size={14} /> Step 2 · Muscle-Specific Questions</SectionLabel>
              <h2 className="text-2xl font-bold tracking-tight">{selectedRegion.name} Safety Check</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Questions tailored specifically to the {selectedRegion.name} to check for urgent red flags before proceeding.
              </p>
            </div>
            <Badge tone="coral"><ShieldAlert size={14} /> Required</Badge>
          </div>

          <div className="divide-y divide-border rounded-xl border border-border bg-card">
            {selectedRegion.muscleQuestions.map((q, idx) => (
              <div key={q} className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-start gap-3">
                  <span className="font-mono text-xs font-bold text-primary mt-0.5">0{idx + 1}</span>
                  <p className="text-sm font-semibold text-foreground leading-relaxed">{q}</p>
                </div>
                <div className="flex gap-2 shrink-0">
                  {(['no', 'yes', 'unsure'] as const).map(ans => (
                    <button
                      key={ans}
                      type="button"
                      onClick={() => setMuscleAnswers({ ...muscleAnswers, [q]: ans })}
                      className={`min-h-10 min-w-16 rounded-xl px-4 text-xs font-bold capitalize transition-all ${
                        muscleAnswers[q] === ans
                          ? ans === 'no'
                            ? 'border border-primary bg-primary text-primary-foreground shadow-sm'
                            : 'border border-destructive bg-destructive text-destructive-foreground shadow-sm'
                          : 'border border-border bg-card text-muted-foreground hover:bg-muted'
                      }`}
                    >
                      {ans === 'unsure' ? 'Not sure' : ans}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Severity Gate Result Card */}
          {allFirstAnswered && (
            <div className={`rounded-xl border p-5 ${
              isAcuteFirst ? 'border-destructive/40 bg-destructive/10' : 'border-primary/30 bg-primary/5'
            }`}>
              <div className="flex items-start gap-3.5">
                {isAcuteFirst ? <AlertCircle size={26} className="text-destructive shrink-0 mt-0.5" /> : <CheckCircle2 size={26} className="text-primary shrink-0 mt-0.5" />}
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h4 className="text-base font-bold text-foreground">
                      {isAcuteFirst ? 'ACUTE RED FLAG · AUTOMATIC DOCTOR ESCALATION' : 'Safety Check Cleared · SAFE'}
                    </h4>
                    <Badge tone={isAcuteFirst ? 'coral' : 'teal'}>
                      {isAcuteFirst ? 'Module 4: Severity Gate Triggered' : 'Proceed Permitted'}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {isAcuteFirst
                      ? 'In accordance with clinical safety protocol (Module 4 Severity Gate), because urgent symptoms were flagged, ALL AI-driven content is strictly bypassed. You are being immediately routed to credentialed medical specialists.'
                      : 'No critical neurological or trauma red flags detected. You may safely proceed to AI muscle cross-questioning.'}
                  </p>
                </div>
              </div>

              {isAcuteFirst && (
                <div className="mt-4 pt-4 border-t border-destructive/20 flex flex-col sm:flex-row gap-2.5 justify-end">
                  <Button
                    variant="danger"
                    onClick={() => handleFinishAndSave('/booking')}
                    icon={CalendarDays}
                    testId="button-urgent-book-doctor"
                  >
                    Immediate Doctor Appointment (Auto-Route)
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={() => handleFinishAndSave('/thread')}
                    icon={Stethoscope}
                    testId="button-urgent-doctor-thread"
                  >
                    Send Urgent Triage to Doctor
                  </Button>
                </div>
              )}
            </div>
          )}

          <div className="flex items-center justify-between border-t border-border pt-4">
            <Button variant="ghost" onClick={() => setStep(1)} icon={ArrowLeft}>
              Back to Model
            </Button>
            {!isAcuteFirst ? (
              <Button
                disabled={!allFirstAnswered}
                onClick={() => setStep(3)}
                icon={ArrowRight}
                testId="button-step2-continue"
              >
                Continue to AI Analysis
              </Button>
            ) : null}
          </div>
        </Panel>
      )}

      {/* STEP 3: AI CHAT CROSS-QUESTIONING, NARROWING & RECOMMENDED DIET/EXERCISES */}
      {step === 3 && (
        <Panel className="space-y-6">
          <div>
            <SectionLabel><Sparkles size={14} /> Step 3 · AI Cross-Questioning & Advisory</SectionLabel>
            <h2 className="text-2xl font-bold tracking-tight">AI Diagnostic Interview</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              The AI model cross-examines your symptoms to narrow down the target muscle group, then recommends safe exercises and localized nutrition.
            </p>
          </div>

          {/* AI Cross-Questioning Box */}
          <div className="space-y-4 rounded-xl border border-border bg-muted/20 p-5">
            <div className="flex items-center gap-2 font-mono text-xs font-bold text-primary">
              <Sparkles size={16} /> AI Cross-Questioning (Understanding the Root Muscle)
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-foreground">When did this discomfort start, and what was the initial trigger?</label>
                <input
                  value={aiQuestions.onset}
                  onChange={e => setAiQuestions({ ...aiQuestions, onset: e.target.value })}
                  className="mt-1 h-11 w-full rounded-xl border border-border bg-background px-3 text-xs outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-foreground">Which specific movement worsens the pain most?</label>
                <input
                  value={aiQuestions.movementPain}
                  onChange={e => setAiQuestions({ ...aiQuestions, movementPain: e.target.value })}
                  className="mt-1 h-11 w-full rounded-xl border border-border bg-background px-3 text-xs outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-foreground">Does anything ease the pain (e.g. resting, warmth, stretching)?</label>
                <input
                  value={aiQuestions.relief}
                  onChange={e => setAiQuestions({ ...aiQuestions, relief: e.target.value })}
                  className="mt-1 h-11 w-full rounded-xl border border-border bg-background px-3 text-xs outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>
            </div>

            {/* Ranked narrowed muscle group */}
            <div className="mt-4 rounded-xl border border-primary/25 bg-card p-4">
              <span className="text-xs font-bold uppercase tracking-wider text-primary">AI Narrowed Structure:</span>
              <div className="mt-2 flex items-center justify-between">
                <div>
                  <h4 className="text-base font-bold text-foreground">{selectedRegion.candidates[0].name}</h4>
                  <p className="font-mono text-xs text-muted-foreground">{selectedRegion.candidates[0].latinName}</p>
                </div>
                <Badge tone="teal">{selectedRegion.candidates[0].confidence}% Match</Badge>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                Signals: {selectedRegion.candidates[0].matchCriteria.join(' · ')}
              </p>
            </div>
          </div>

          {/* AI Recommended Diet & Exercises */}
          <div className="space-y-5 rounded-xl border border-border bg-card p-5">
            <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
              <Activity size={18} className="text-primary" /> AI-Recommended Exercises & Diet
            </h3>

            {/* Exercises */}
            <div>
              <p className="text-xs font-bold uppercase text-muted-foreground mb-2">Gentle Mobility Exercises</p>
              <div className="grid gap-3 sm:grid-cols-3">
                {[
                  ['Pelvic Tilts & Rocking', '2 sets × 8 reps', 'Eases lumbar compression'],
                  ['Knee-to-Chest Stretch', '2 × 15s holds', 'Gentle glute & paraspinal relief'],
                  ['Short Guided Walk', '10 minutes on flat floor', 'Increases blood perfusion']
                ].map(([title, dose, note]) => (
                  <div key={title} className="rounded-xl border border-border bg-muted/20 p-3.5 text-xs">
                    <p className="font-bold text-foreground">{title}</p>
                    <p className="font-mono text-[11px] text-primary mt-1">{dose}</p>
                    <p className="text-muted-foreground mt-1 text-[11px]">{note}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Pakistani Anti-inflammatory Diet with Decision Point */}
            <div className="border-t border-border pt-4 space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold uppercase text-muted-foreground flex items-center gap-1.5">
                  <HeartPulse size={15} className="text-primary" /> Anti-Inflammatory Pakistani Diet Guidance
                </p>
                <Badge tone={dietDecision === 'PATIENT_ACCEPTED' ? 'teal' : dietDecision === 'SENT_FOR_REVIEW' ? 'coral' : 'neutral'}>
                  {dietDecision.replaceAll('_', ' ')}
                </Badge>
              </div>

              <div className="grid gap-2.5 sm:grid-cols-2 text-xs">
                <div className="rounded-lg border border-border bg-accent/20 p-3">
                  <strong>Adrak & Haldi Kahwa (Ginger & Turmeric tea):</strong>
                  <p className="text-muted-foreground mt-0.5">Helps downregulate inflammatory cytokines naturally.</p>
                </div>
                <div className="rounded-lg border border-border bg-accent/20 p-3">
                  <strong>Tazeh Sabziyan (Spinach & Fenugreek / Palak):</strong>
                  <p className="text-muted-foreground mt-0.5">High magnesium and antioxidants for muscle relaxation.</p>
                </div>
              </div>

              <div className="rounded-xl border border-primary/20 bg-primary/5 p-3.5 text-xs">
                <p className="font-bold text-foreground">Diet Decision Point:</p>
                <p className="text-muted-foreground mt-0.5">
                  Have comorbidities? Choose whether to accept this diet guidance directly or verify with doctor:
                </p>
                <div className="mt-2.5 flex flex-wrap gap-2">
                  <Button
                    variant={dietDecision === 'PATIENT_ACCEPTED' ? 'primary' : 'secondary'}
                    className="min-h-9 px-3 text-xs"
                    onClick={() => setDietDecision('PATIENT_ACCEPTED')}
                    icon={Check}
                  >
                    Accept Directly into Feed
                  </Button>
                  <Button
                    variant={dietDecision === 'SENT_FOR_REVIEW' ? 'danger' : 'secondary'}
                    className="min-h-9 px-3 text-xs"
                    onClick={() => setDietDecision('SENT_FOR_REVIEW')}
                    icon={Stethoscope}
                  >
                    Send to Doctor for Verification
                  </Button>
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between border-t border-border pt-4">
            <Button variant="ghost" onClick={() => setStep(2)} icon={ArrowLeft}>
              Back to Questions
            </Button>
            <Button onClick={() => setStep(4)} icon={ArrowRight} testId="button-step3-continue">
              Continue to Final Safety Recheck
            </Button>
          </div>
        </Panel>
      )}

      {/* STEP 4: SECOND RED-FLAG RECHECK & CONSULT / APPOINTMENT OPTIONS */}
      {step === 4 && (
        <Panel className="space-y-6">
          <div>
            <SectionLabel><ShieldAlert size={14} /> Step 4 · Second Red-Flag Recheck & Doctor Routing</SectionLabel>
            <h2 className="text-2xl font-bold tracking-tight">Final Safety Confirmation</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              After AI recommendations, we perform a mandatory second red-flag check to ensure you are safe before deciding on doctor care.
            </p>
          </div>

          {/* Second Red-Flag Questions */}
          <div className="divide-y divide-border rounded-xl border border-border bg-card">
            {secondQuestions.map((q, idx) => (
              <div key={q} className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-start gap-3">
                  <span className="font-mono text-xs font-bold text-primary mt-0.5">0{idx + 1}</span>
                  <p className="text-sm font-semibold text-foreground leading-relaxed">{q}</p>
                </div>
                <div className="flex gap-2 shrink-0">
                  {(['no', 'yes', 'unsure'] as const).map(ans => (
                    <button
                      key={ans}
                      type="button"
                      onClick={() => setSecondRedFlags({ ...secondRedFlags, [q]: ans })}
                      className={`min-h-10 min-w-16 rounded-xl px-4 text-xs font-bold capitalize transition-all ${
                        secondRedFlags[q] === ans
                          ? ans === 'no'
                            ? 'border border-primary bg-primary text-primary-foreground shadow-sm'
                            : 'border border-destructive bg-destructive text-destructive-foreground shadow-sm'
                          : 'border border-border bg-card text-muted-foreground hover:bg-muted'
                      }`}
                    >
                      {ans === 'unsure' ? 'Not sure' : ans}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Doctor Report Transmission Checkbox */}
          <div className="rounded-xl border border-primary/25 bg-primary/5 p-4">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={reportSent}
                onChange={e => setReportSent(e.target.checked)}
                className="mt-1 h-4 w-4 accent-primary"
              />
              <div>
                <span className="text-sm font-bold text-foreground">
                  Send AI-Drafted Report to Doctor's Dashboard
                </span>
                <p className="text-xs text-muted-foreground mt-0.5">
                  If checked, the full report with your pinpoint coordinates, narrowed muscle group ({selectedRegion.candidates[0].name}), and diet choice will be posted to Dr. Maya Chen's review queue.
                </p>
              </div>
            </label>
          </div>

          {/* Doctor Next Steps Options */}
          <div className="border-t border-border pt-4">
            <h4 className="text-base font-bold text-foreground mb-1">Choose How You Want to Proceed:</h4>
            <p className="text-xs text-muted-foreground mb-4">
              Select whether you want to chat online with a doctor or book an immediate in-person appointment.
            </p>

            <div className="grid gap-4 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => handleFinishAndSave('/thread')}
                className="flex flex-col justify-between rounded-xl border border-border p-5 text-left transition-all hover:border-primary hover:shadow-clinic"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-base text-foreground">Online Consultation Thread</span>
                    <MessageSquare size={18} className="text-primary" />
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground leading-relaxed">
                    Open an asynchronous consultation with Dr. Maya Chen. Review notes, submit lab reports, and receive ongoing advice.
                  </p>
                </div>
                <div className="mt-4 flex items-center gap-1.5 text-xs font-bold text-primary">
                  <span>Open Care Thread</span>
                  <ArrowRight size={14} />
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleFinishAndSave('/booking')}
                className="flex flex-col justify-between rounded-xl border border-primary/40 bg-primary/5 p-5 text-left transition-all hover:border-primary hover:shadow-clinic"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-base text-foreground">Book Doctor Appointment</span>
                    <CalendarDays size={18} className="text-primary" />
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground leading-relaxed">
                    Escalate to an in-person or live video appointment with an orthopedic specialist. Slot selection and clinic hours.
                  </p>
                </div>
                <div className="mt-4 flex items-center gap-1.5 text-xs font-bold text-primary">
                  <span>Go to Booking Calendar</span>
                  <ArrowRight size={14} />
                </div>
              </button>
            </div>
          </div>

          <div className="border-t border-border pt-4 flex justify-between">
            <Button variant="ghost" onClick={() => setStep(3)} icon={ArrowLeft}>
              Back to AI Guidance
            </Button>
          </div>
        </Panel>
      )}
    </div>
  );
}

/* -------------------------------------------------------------
   CONSULTATION THREAD (CARE CHAT + LAB REPORTS + APPOINTMENT SHORTCUT)
-------------------------------------------------------------- */
function ThreadPage({
  setLocation,
  consultation,
  onUpdateConsultation
}: {
  setLocation: (path: string) => void;
  consultation: ConsultationState;
  onUpdateConsultation: (next: ConsultationState) => void;
}) {
  const [activeTab, setActiveTab] = useState<'Chat' | 'Labs' | 'Anatomy'>('Chat');
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<Array<{ sender: string; text: string; time: string }>>([
    {
      sender: 'Dr. Maya Chen',
      text: `Hello Aisha, I received your intake report for ${consultation.region}. The AI narrowed the target muscle to ${consultation.candidateMuscles[0]?.name || 'paraspinal tissues'}, and your red-flag safety answers were reviewed. Please adhere to the gentle movements. You can also upload any X-rays or lab reports here.`,
      time: '09:15 AM'
    }
  ]);

  // Lab report upload state
  const [uploadedFile, setUploadedFile] = useState<string | null>(null);
  const [labSummary, setLabSummary] = useState('');

  const handleSendMessage = () => {
    if (!message.trim()) return;
    setMessages(prev => [
      ...prev,
      { sender: 'You', text: message.trim(), time: 'Just now' }
    ]);
    setMessage('');
  };

  const handleUploadLabReport = () => {
    if (!uploadedFile) return;
    const newLab: LabReportItem = {
      id: `LAB-${Date.now().toString().slice(-3)}`,
      name: uploadedFile.replace(/\.[^/.]+$/, ''),
      fileName: uploadedFile,
      uploadDate: 'Today, Just now',
      summary: labSummary || 'AI OCR Summary: Report extracted successfully. Awaiting Dr. Maya Chen clinical review.',
      status: 'Pending Doctor Review'
    };
    onUpdateConsultation({
      ...consultation,
      labReports: [newLab, ...consultation.labReports]
    });
    setUploadedFile(null);
    setLabSummary('');
  };

  return (
    <div className="animate-rise space-y-6">
      <PageHeader
        eyebrow="Consultation Thread · Case SK-2048"
        title="Patient-Doctor Consultation"
        detail="Chat with Dr. Maya Chen, upload your laboratory/X-ray reports, and access 24-hour follow-up."
        action={
          <div className="flex items-center gap-2">
            <Button variant="secondary" onClick={() => setLocation('/follow-up')} icon={RefreshCw}>
              24h Follow-up Check
            </Button>
            <Button onClick={() => setLocation('/booking')} icon={CalendarDays}>
              Book In-Person Visit
            </Button>
          </div>
        }
      />

      {/* Tabs */}
      <div className="flex gap-2 border-b border-border pb-2">
        {(['Chat', 'Labs', 'Anatomy'] as const).map(tab => (
          <button
            key={tab}
            type="button"
            onClick={() => setActiveTab(tab)}
            className={`rounded-xl px-4 py-2.5 text-xs font-bold transition-all ${
              activeTab === tab
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'bg-card text-muted-foreground border border-border hover:bg-muted'
            }`}
          >
            {tab === 'Chat' ? 'Care Conversation' : tab === 'Labs' ? 'Lab & X-Ray Reports' : 'Muscular Anatomical Layer'}
          </button>
        ))}
      </div>

      {activeTab === 'Chat' && (
        <div className="grid gap-6 lg:grid-cols-[1.2fr_.8fr]">
          <Panel className="flex min-h-[520px] flex-col p-0 overflow-hidden">
            <div className="border-b border-border bg-card p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="grid h-10 w-10 place-items-center rounded-full bg-sidebar font-bold text-sidebar-primary text-sm">
                  MC
                </div>
                <div>
                  <h3 className="text-sm font-bold text-foreground">Dr. Maya Chen (MBBS, FCPS)</h3>
                  <p className="text-xs text-primary flex items-center gap-1">
                    <StatusDot /> Online · Consultation Active
                  </p>
                </div>
              </div>
              <Badge tone="teal">{consultation.region}</Badge>
            </div>

            <div className="scrollbar-thin flex-1 space-y-4 overflow-auto bg-muted/20 p-5">
              {messages.map((m, idx) => (
                <div
                  key={idx}
                  className={`max-w-[85%] rounded-2xl p-4 text-sm leading-relaxed ${
                    m.sender === 'You'
                      ? 'ml-auto rounded-tr-sm bg-primary text-primary-foreground'
                      : 'rounded-tl-sm border border-border bg-card shadow-sm'
                  }`}
                >
                  <div className="mb-1 font-mono text-[10px] opacity-70 uppercase">{m.sender} · {m.time}</div>
                  <p>{m.text}</p>
                </div>
              ))}
            </div>

            <div className="flex gap-2 border-t border-border p-4 bg-card">
              <input
                value={message}
                onChange={e => setMessage(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSendMessage()}
                placeholder="Write a message to Dr. Chen…"
                className="min-h-12 flex-1 rounded-xl border border-border bg-background px-4 text-sm outline-none ring-primary/20 placeholder:text-muted-foreground focus:ring-2"
              />
              <Button onClick={handleSendMessage} icon={Send}>
                Send
              </Button>
            </div>
          </Panel>

          <div className="space-y-4">
            <Panel className="p-5">
              <SectionLabel><ShieldCheck size={14} /> Case Summary</SectionLabel>
              <h4 className="text-base font-bold">{consultation.region}</h4>
              <p className="text-xs text-muted-foreground">Coordinates: {consultation.point}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Badge tone="teal">Primary Muscle: {consultation.candidateMuscles[0]?.name}</Badge>
                <Badge tone="lime">Safety Gate: SAFE</Badge>
              </div>

              <div className="mt-4 border-t border-border pt-3 space-y-2 text-xs text-muted-foreground">
                <p><strong>Report Status:</strong> {consultation.reportSentToDoctor ? '✓ Transmitted to Doctor Console' : 'Local Draft'}</p>
                <p><strong>Diet Guidance:</strong> {consultation.dietState.replaceAll('_', ' ')}</p>
                <p><strong>Follow-Up:</strong> {consultation.followUpStatus === 'improving' ? 'Improving' : 'Due in 24 hours'}</p>
              </div>
            </Panel>

            <Panel className="p-5">
              <SectionLabel><CalendarDays size={14} /> In-Thread Appointment Shortcut</SectionLabel>
              <p className="text-xs text-muted-foreground leading-relaxed">
                If your pain increases or async messaging is not sufficient, book an in-person slot immediately.
              </p>
              <Button className="mt-3 w-full text-xs" onClick={() => setLocation('/booking')} icon={CalendarDays}>
                Book In-Person Clinic Visit
              </Button>
            </Panel>
          </div>
        </div>
      )}

      {/* TAB 2: LAB REPORTS SUBMISSION */}
      {activeTab === 'Labs' && (
        <Panel className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <SectionLabel><UploadCloud size={14} /> Module 12 · Patient Lab Submission</SectionLabel>
              <h3 className="text-xl font-bold">Submit Your Laboratory & Imaging Reports</h3>
              <p className="text-xs text-muted-foreground">
                Upload your blood test, MRI, or X-ray reports. Our OCR pipeline extracts summary text for Dr. Maya Chen to review.
              </p>
            </div>
            <Badge tone="teal">Doctor Reviewed</Badge>
          </div>

          {/* Upload Widget */}
          <div className="rounded-xl border border-dashed border-primary/40 bg-primary/5 p-6 text-center">
            <UploadCloud size={32} className="mx-auto text-primary" />
            <h4 className="mt-2 text-sm font-bold text-foreground">Select Lab Report to Upload</h4>
            <p className="text-xs text-muted-foreground mt-1">Accepts PDF, DICOM, or high-resolution photos</p>

            <div className="mt-4 flex flex-wrap justify-center gap-2">
              {['complete_blood_count.pdf', 'lumbar_xray_scan.png', 'mri_spine_report.pdf'].map(file => (
                <button
                  key={file}
                  type="button"
                  onClick={() => {
                    setUploadedFile(file);
                    setLabSummary(`Extracted values from ${file}: Normal limits with mild inflammatory markers.`);
                  }}
                  className={`rounded-lg border px-3 py-1.5 text-xs font-semibold ${
                    uploadedFile === file
                      ? 'border-primary bg-primary text-primary-foreground'
                      : 'border-border bg-card text-muted-foreground hover:bg-muted'
                  }`}
                >
                  {file}
                </button>
              ))}
            </div>

            {uploadedFile && (
              <div className="mt-4 max-w-md mx-auto space-y-3">
                <input
                  value={labSummary}
                  onChange={e => setLabSummary(e.target.value)}
                  placeholder="Optional patient note about this test…"
                  className="h-10 w-full rounded-xl border border-border bg-background px-3 text-xs outline-none"
                />
                <Button onClick={handleUploadLabReport} icon={UploadCloud} className="w-full text-xs">
                  Upload "{uploadedFile}" for Doctor Review
                </Button>
              </div>
            )}
          </div>

          {/* Existing Lab Reports */}
          <div className="space-y-3">
            <h4 className="text-sm font-bold text-foreground">Attached Laboratory Documents</h4>
            {consultation.labReports.map(report => (
              <div key={report.id} className="rounded-xl border border-border p-4 bg-muted/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
                    <FileText size={20} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h5 className="text-sm font-bold text-foreground">{report.name}</h5>
                      <span className="font-mono text-[10px] text-muted-foreground">({report.fileName})</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">{report.summary}</p>
                    <p className="text-[10px] font-mono text-primary mt-1">Uploaded: {report.uploadDate}</p>
                  </div>
                </div>
                <Badge tone={report.status === 'Approved by Doctor' ? 'teal' : 'lime'}>
                  {report.status}
                </Badge>
              </div>
            ))}
          </div>
        </Panel>
      )}

      {/* TAB 3: ANATOMY VISUALIZATION */}
      {activeTab === 'Anatomy' && (
        <Panel className="space-y-6">
          <SectionLabel><Move3d size={14} /> Muscular Anatomical Layer</SectionLabel>
          <div className="grid gap-6 md:grid-cols-[.9fr_1.1fr]">
            <div className="relative mx-auto w-full max-w-[340px] overflow-hidden rounded-xl border border-border bg-card">
              <img src="/muscular_anatomy_body.jpg" alt="Muscular anatomy" className="w-full object-cover" />
            </div>
            <div>
              <h3 className="text-xl font-bold">{consultation.region}</h3>
              <p className="font-mono text-xs text-muted-foreground">{consultation.taxonomy} · {consultation.point}</p>
              <div className="mt-4 rounded-xl border border-primary/20 bg-primary/5 p-4 text-xs leading-relaxed text-muted-foreground">
                <strong className="text-foreground">Clinical Continuity:</strong> The pinpoint coordinates captured during intake remain bound to this consultation thread. Dr. Maya Chen sees the exact anatomical sub-mesh.
              </div>

              <div className="mt-5 space-y-2">
                <h4 className="text-sm font-bold">Narrowed Muscle Structures:</h4>
                {consultation.candidateMuscles.map(cand => (
                  <div key={cand.name} className="rounded-xl border border-border p-3 text-xs">
                    <div className="flex justify-between font-bold text-foreground">
                      <span>{cand.name}</span>
                      <span className="text-primary">{cand.confidence}% match</span>
                    </div>
                    <p className="text-muted-foreground italic font-mono mt-0.5">{cand.latinName}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Panel>
      )}
    </div>
  );
}

/* -------------------------------------------------------------
   FOLLOW-UP SCREEN (24-HOUR CHECK-IN WINDOW)
-------------------------------------------------------------- */
function FollowUpPage({
  setLocation,
  consultation,
  onUpdateConsultation
}: {
  setLocation: (path: string) => void;
  consultation: ConsultationState;
  onUpdateConsultation: (next: ConsultationState) => void;
}) {
  const [status, setStatus] = useState<'improving' | 'stable' | 'worse'>(
    consultation.followUpStatus === 'pending' ? 'improving' : consultation.followUpStatus
  );
  const [note, setNote] = useState(consultation.followUpNote || '');
  const [submitted, setSubmitted] = useState(false);

  const handleSaveFollowUp = () => {
    onUpdateConsultation({
      ...consultation,
      followUpStatus: status,
      followUpNote: note
    });
    setSubmitted(true);
  };

  return (
    <div className="mx-auto max-w-3xl animate-rise space-y-6">
      <button
        onClick={() => setLocation('/thread')}
        className="inline-flex items-center gap-2 text-sm font-bold text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft size={16} /> Back to Consultation Thread
      </button>

      <PageHeader
        eyebrow="Continuity Check · Module 19"
        title="24-Hour Condition Follow-Up"
        detail="Tell your care team how your muscles feel 24 hours after the initial guidance and exercises."
        action={<Badge tone="teal"><RefreshCw size={14} /> 24h Check-in Window</Badge>}
      />

      <Panel className="space-y-6">
        {submitted ? (
          <div className="py-8 text-center space-y-3">
            <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-primary text-primary-foreground">
              <Check size={32} />
            </div>
            <h3 className="text-2xl font-bold text-foreground">Follow-Up Recorded Successfully</h3>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              Your response has been sent to Dr. Maya Chen and updated on the care timeline.
            </p>
            <Button className="mt-4" onClick={() => setLocation('/thread')} icon={MessageSquare}>
              Return to Consultation
            </Button>
          </div>
        ) : (
          <div className="space-y-5">
            <div>
              <h3 className="text-lg font-bold text-foreground">
                Compared to yesterday, how is your {consultation.region} feeling?
              </h3>
              <p className="text-xs text-muted-foreground mt-1">
                Select the option that best describes your change in pain or mobility:
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              {[
                { id: 'improving', title: 'Feeling Better', desc: 'Less stiffness and easier movement', tone: 'teal' as const },
                { id: 'stable', title: 'About the Same', desc: 'No significant change in discomfort', tone: 'lime' as const },
                { id: 'worse', title: 'Worse or Spreading', desc: 'Increased pain or new symptoms', tone: 'coral' as const },
              ].map(item => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setStatus(item.id as any)}
                  className={`rounded-2xl border p-4 text-left transition-all ${
                    status === item.id
                      ? item.id === 'worse'
                        ? 'border-destructive bg-destructive/10 ring-2 ring-destructive/20'
                        : 'border-primary bg-primary/10 ring-2 ring-primary/20'
                      : 'border-border bg-card hover:bg-muted'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sm text-foreground">{item.title}</span>
                    <Badge tone={item.tone}>{item.id}</Badge>
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">{item.desc}</p>
                </button>
              ))}
            </div>

            {status === 'worse' && (
              <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-xs leading-relaxed text-destructive font-semibold">
                ⚠️ Since your condition has worsened, we recommend scheduling an urgent in-person doctor consultation.
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-foreground mb-1">Detailed Progress Note for Doctor</label>
              <textarea
                value={note}
                onChange={e => setNote(e.target.value)}
                placeholder="e.g. Discomfort eased after gentle walking, but still notice tightness when getting out of bed..."
                className="min-h-28 w-full rounded-xl border border-border bg-background p-3 text-xs outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>

            <div className="flex items-center justify-between border-t border-border pt-4">
              <Button variant="ghost" onClick={() => setLocation('/thread')}>
                Cancel
              </Button>
              <Button onClick={handleSaveFollowUp} icon={Check}>
                Submit 24-Hour Update
              </Button>
            </div>
          </div>
        )}
      </Panel>
    </div>
  );
}

/* -------------------------------------------------------------
   DOCTOR DASHBOARD (UNCLUTTERED, ALIGNED WITH PATIENT FLOW)
-------------------------------------------------------------- */
function DoctorDashboard({
  setLocation,
  consultation,
  onUpdateConsultation
}: {
  setLocation: (path: string) => void;
  consultation: ConsultationState;
  onUpdateConsultation?: (next: ConsultationState) => void;
}) {
  const [activeTab, setActiveTab] = useState<'Triage' | 'Differential' | 'Labs' | 'Schedule'>('Triage');
  const [rxNotes, setRxNotes] = useState('');
  const [rxApproved, setRxApproved] = useState(false);

  return (
    <div className="animate-rise space-y-6">
      <PageHeader
        eyebrow="Clinician Console · Credentialed Access"
        title="Doctor Care Command & Triage"
        detail="Review AI-transmitted symptom intakes, evaluate muscle-specific differentials, sign off on lab reports, and manage appointment requests."
        action={<Badge tone="coral"><Stethoscope size={14} /> Dr. Maya Chen · Orthopedic Surgery</Badge>}
      />

      {/* Top Overview Cards - Clean & Accessible */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Metric label="Cases Awaiting Review" value="03" note="1 with escalated visit" icon={ClipboardCheck} />
        <Metric label="Red-Flag Watch" value="00" note="All cleared via Severity Gate" icon={ShieldCheck} tone="teal" />
        <Metric label="Lab Reports Pending" value={String(consultation.labReports.filter(l => l.status.includes('Pending')).length || 1)} note="Requires doctor sign-off" icon={FileText} tone="lime" />
        <Metric label="Upcoming Clinic Visits" value="04" note="Next: Tomorrow 09:30 AM" icon={CalendarDays} />
      </div>

      {/* Modern Decluttered Tab Navigation */}
      <div className="flex flex-wrap gap-2 border-b border-border pb-2">
        {(['Triage', 'Differential', 'Labs', 'Schedule'] as const).map(tab => (
          <button
            key={tab}
            type="button"
            onClick={() => setActiveTab(tab)}
            className={`rounded-xl px-4 py-2 text-xs font-bold transition-all ${
              activeTab === tab
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'bg-card text-muted-foreground border border-border hover:bg-muted'
            }`}
          >
            {tab === 'Triage' ? 'Patient Intake Triage' : tab === 'Differential' ? 'Ranked Differential' : tab === 'Labs' ? 'Submitted Lab Reports' : 'Clinic Schedule & Slots'}
          </button>
        ))}
      </div>

      {/* TAB 1: PATIENT INTAKE TRIAGE */}
      {activeTab === 'Triage' && (
        <div className="grid gap-6 lg:grid-cols-[1.2fr_.8fr]">
          <Panel className="space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <SectionLabel><FileCheck2 size={14} /> Incoming Clinical Report · Case SK-2048</SectionLabel>
                <h3 className="text-xl font-bold text-foreground">Aisha Rahman · {consultation.region}</h3>
                <p className="text-xs text-muted-foreground">32-year-old female · Report transmitted via patient intake portal</p>
              </div>
              <Badge tone="teal">Intake Received</Badge>
            </div>

            {/* Muscle Map Snapshot & Depth */}
            <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 space-y-3">
              <span className="text-xs font-bold text-primary uppercase tracking-wider block">
                1. Muscle Pinpoint & Layer Filter
              </span>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div><span className="text-muted-foreground">Selected Muscle Area:</span> <strong className="text-foreground block">{consultation.region}</strong></div>
                <div><span className="text-muted-foreground">Pinpoint Coordinate:</span> <strong className="text-foreground block">{consultation.point}</strong></div>
                <div><span className="text-muted-foreground">Tissue Depth:</span> <strong className="text-foreground block">{consultation.depth} Tissue Layer</strong></div>
                <div><span className="text-muted-foreground">Anatomical Code:</span> <strong className="text-foreground block">{consultation.taxonomy}</strong></div>
              </div>
            </div>

            {/* AI Cross-Questioning Summary */}
            <div className="rounded-xl border border-border bg-card p-4 space-y-2 text-xs">
              <span className="font-bold text-foreground block uppercase tracking-wider text-[11px] text-primary">
                2. AI Diagnostic Cross-Questioning Summary
              </span>
              <div className="space-y-1.5 text-muted-foreground leading-relaxed">
                <p>• <strong>Onset:</strong> {consultation.deepeningAnswers['Onset & Cause'] || '3-5 days ago, lifting heavy groceries'}</p>
                <p>• <strong>Aggravating:</strong> {consultation.deepeningAnswers['Aggravating factor'] || 'Prolonged sitting & forward flexion'}</p>
                <p>• <strong>Relieving:</strong> {consultation.deepeningAnswers['Relieving factor'] || 'Gentle walking & heat therapy'}</p>
              </div>
            </div>

            {/* Red-Flag Safety Gate History */}
            <div className="rounded-xl border border-border bg-card p-4 space-y-2 text-xs">
              <span className="font-bold text-foreground block uppercase tracking-wider text-[11px] text-primary">
                3. Severity Gate Screening Log (Module 3 & 4)
              </span>
              <div className="flex flex-wrap gap-2 pt-1">
                <Badge tone="teal">Bilateral Weakness: No</Badge>
                <Badge tone="teal">Bowel/Bladder: Normal</Badge>
                <Badge tone="teal">Major Trauma: No</Badge>
                <Badge tone="teal">Systemic Fever/Chills: No</Badge>
              </div>
            </div>

            <div className="pt-2 flex flex-wrap gap-2.5">
              <Button onClick={() => setLocation('/thread')} icon={MessageSquare} className="text-xs">
                Open Patient Consultation Thread
              </Button>
              <Button variant="secondary" onClick={() => setActiveTab('Differential')} icon={Brain} className="text-xs">
                View Differential
              </Button>
            </div>
          </Panel>

          {/* Right Column: Quick Doctor Actions */}
          <div className="space-y-5">
            <Panel className="p-5 space-y-3">
              <SectionLabel><HeartPulse size={14} /> Care Plan Review</SectionLabel>
              <h4 className="text-sm font-bold text-foreground">Diet & Mobility Advisory</h4>
              <p className="text-xs text-muted-foreground">
                Patient selected <strong>{consultation.dietState.replaceAll('_', ' ')}</strong> for the localized Pakistani anti-inflammatory food plan.
              </p>
              <div className="rounded-lg bg-muted/30 p-2.5 text-xs text-muted-foreground">
                Current guidance: Adrak & Haldi tea + leafy greens. No contraindicating comorbidities reported.
              </div>
            </Panel>

            <Panel className="p-5 space-y-3">
              <SectionLabel><CalendarDays size={14} /> In-Person Visit Request</SectionLabel>
              <h4 className="text-sm font-bold text-foreground">Clinic Slot Status</h4>
              <p className="text-xs text-muted-foreground">
                {consultation.escalatedToAppointment
                  ? 'Aisha has escalated her care to an in-person physical examination.'
                  : 'Async messaging active. Aisha can book an in-person visit at any time.'}
              </p>
              <div className="p-2.5 rounded-lg border border-border text-xs">
                <span className="font-bold">Allocated Slot: Tomorrow 09:30 AM</span>
                <p className="text-muted-foreground mt-0.5">Shifa Care Hub · Room 4B</p>
              </div>
            </Panel>
          </div>
        </div>
      )}

      {/* TAB 2: RANKED DIFFERENTIAL DIAGNOSIS (MODULE 9) */}
      {activeTab === 'Differential' && (
        <Panel className="space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <SectionLabel><Brain size={14} /> Module 9 · Doctor-Facing Differential Pipeline</SectionLabel>
              <h3 className="text-xl font-bold text-foreground">Multi-Candidate Branching & Hypotheses</h3>
              <p className="text-xs text-muted-foreground">
                Generated from structured intake coordinates, muscle narrowing, and ICD-10 evidence corpora. Restricted to clinician review.
              </p>
            </div>
            <Badge tone="coral">Clinician Eyes Only</Badge>
          </div>

          <div className="space-y-3 pt-2">
            {/* Hypotheses Cards */}
            <div className="rounded-xl border border-border p-4 bg-card shadow-sm space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold uppercase tracking-wider text-primary">
                  1. Lumbar Paraspinal Myofascial Strain (Primary Candidate)
                </span>
                <span className="font-mono text-xs font-bold text-primary">91% Fit</span>
              </div>
              <p className="text-xs text-foreground font-medium">
                Correlated with {consultation.candidateMuscles[0]?.name || 'Erector Spinae'} pinpoint localization.
              </p>
              <p className="text-xs text-muted-foreground">
                Consistent with acute load strain, worse on extension, absence of neurological deficit. Rule out secondary facet irritation.
              </p>
              <div className="font-mono text-[10px] text-muted-foreground pt-1 border-t border-border/60">
                Provenance: ICD-10-CM M54.50 · StatPearls Lumbosacral Strain Protocol
              </div>
            </div>

            <div className="rounded-xl border border-border p-4 bg-card shadow-sm space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold uppercase tracking-wider text-primary">
                  2. Quadratus Lumborum Trigger Irritation (Secondary Branch)
                </span>
                <span className="font-mono text-xs font-bold text-primary">82% Fit</span>
              </div>
              <p className="text-xs text-foreground font-medium">
                Correlated with {consultation.candidateMuscles[1]?.name || 'Quadratus Lumborum'} deep layer.
              </p>
              <p className="text-xs text-muted-foreground">
                Lateral iliac crest referral mimicry, unilateral trunk lateral flexion restriction.
              </p>
              <div className="font-mono text-[10px] text-muted-foreground pt-1 border-t border-border/60">
                Provenance: Travell & Simons Myofascial Trigger Manual
              </div>
            </div>

            <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 text-xs">
              <span className="font-bold text-primary block mb-1">Clinician Action Plan:</span>
              <p className="text-muted-foreground">
                Prescribe low-load diaphragmatic breathing and gentle pelvic rocking. Re-evaluate at 24-hour follow-up.
              </p>
            </div>
          </div>
        </Panel>
      )}

      {/* TAB 3: SUBMITTED LAB REPORTS */}
      {activeTab === 'Labs' && (
        <Panel className="space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <SectionLabel><FileText size={14} /> Module 12 · Patient Uploaded Reports</SectionLabel>
              <h3 className="text-xl font-bold text-foreground">Review & Sign Off on Patient Labs</h3>
              <p className="text-xs text-muted-foreground">
                Review OCR-extracted summaries and authorize approved clinical records.
              </p>
            </div>
            <Badge tone="teal">Pending Doctor Gate</Badge>
          </div>

          <div className="space-y-3 pt-2">
            {consultation.labReports.map(report => (
              <div key={report.id} className="rounded-xl border border-border p-5 bg-card space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <div className="grid h-10 w-10 place-items-center rounded-xl bg-primary/10 text-primary">
                      <FileText size={20} />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-foreground">{report.name}</h4>
                      <p className="text-xs text-muted-foreground">{report.fileName} · Uploaded {report.uploadDate}</p>
                    </div>
                  </div>
                  <Badge tone={report.status.includes('Approved') ? 'teal' : 'lime'}>
                    {report.status}
                  </Badge>
                </div>

                <div className="rounded-lg bg-muted/30 p-3 text-xs text-foreground/90 leading-relaxed">
                  <strong>AI OCR Extracted Summary:</strong> {report.summary}
                </div>

                <div className="flex items-center justify-end gap-2 pt-1">
                  <Button variant="secondary" className="text-xs min-h-9 px-3" onClick={() => alert('Viewing full diagnostic image scan.')}>
                    View Original Document
                  </Button>
                  <Button className="text-xs min-h-9 px-3" icon={Check} onClick={() => alert('Lab report approved and marked in patient consultation record.')}>
                    Approve & Sign Off
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </Panel>
      )}

      {/* TAB 4: CLINIC SCHEDULE & SLOTS */}
      {activeTab === 'Schedule' && (
        <Panel className="space-y-5">
          <SectionLabel><CalendarDays size={14} /> Clinic Timetable & In-Person Appointments</SectionLabel>
          <h3 className="text-xl font-bold text-foreground">Tomorrow's Clinical Queue</h3>

          <div className="space-y-3">
            {[
              { time: '09:30 AM', patient: 'Aisha Rahman (SK-2048)', type: 'Lower Back Muscle Strain', status: 'Confirmed' },
              { time: '11:00 AM', patient: 'Kamran Ali', type: 'Rotator Cuff Follow-up', status: 'Confirmed' },
              { time: '02:30 PM', patient: 'Zainab Bibi', type: 'Patellar Tendinopathy', status: 'Available' },
              { time: '04:00 PM', patient: 'Hamza Sheikh', type: 'Cervical Spine Assessment', status: 'Confirmed' },
            ].map(item => (
              <div key={item.time} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border p-4 bg-card">
                <div className="flex items-center gap-4">
                  <span className="font-mono text-xs font-bold text-primary bg-primary/10 px-2.5 py-1 rounded-lg">
                    {item.time}
                  </span>
                  <div>
                    <h4 className="text-sm font-bold text-foreground">{item.patient}</h4>
                    <p className="text-xs text-muted-foreground">{item.type}</p>
                  </div>
                </div>
                <Badge tone={item.status === 'Confirmed' ? 'teal' : 'neutral'}>
                  {item.status}
                </Badge>
              </div>
            ))}
          </div>
        </Panel>
      )}
    </div>
  );
}

/* -------------------------------------------------------------
   PHYSIO DASHBOARD (UNCLUTTERED, ALIGNED WITH PATIENT FLOW)
-------------------------------------------------------------- */
function PhysioDashboard({ setLocation }: { setLocation: (path: string) => void }) {
  const [feedbackSent, setFeedbackSent] = useState(false);
  const [sessionNote, setSessionNote] = useState('');
  const [sessionTolerance, setSessionTolerance] = useState<'Optimal' | 'Mild Discomfort' | 'Intolerant'>('Optimal');

  return (
    <div className="animate-rise space-y-6">
      <PageHeader
        eyebrow="Physiotherapy Care Board · Movement Lane"
        title="Active Movement Plans & Clinical Feedback"
        detail="Monitor patient exercise tolerance, provide structured session notes back to doctor threads, and observe red-flag safety boundaries."
        action={<Badge tone="lime"><Activity size={14} /> Leo Martins · Lead MSK Physiotherapist</Badge>}
      />

      <div className="grid gap-6 lg:grid-cols-[1.2fr_.8fr]">
        {/* Left Column: Active Patient Case & Exercises */}
        <div className="space-y-6">
          <Panel className="space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <SectionLabel><UsersRound size={14} /> Case SK-2048 · Active Session</SectionLabel>
                <h3 className="text-xl font-bold text-foreground">Aisha Rahman · Lower Back Care Plan</h3>
                <p className="text-xs text-muted-foreground mt-0.5">Referred by Dr. Maya Chen · Severity Gate: SAFE</p>
              </div>
              <Badge tone="teal">Cleared for Loading</Badge>
            </div>

            {/* Prescribed Exercises */}
            <div className="space-y-3 pt-1">
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground block">
                Prescribed Tier A & B Exercise Protocols
              </span>

              {[
                { name: '90/90 Diaphragmatic Breathing & Core Brace', dose: '2 minutes relaxed pacing', goal: 'Reduce paraspinal muscle hypertonicity' },
                { name: 'Pelvic Tilts & Lumbar Rocking', dose: '2 sets × 8 controlled reps', goal: 'Gentle facet joint mobilization' },
                { name: 'Straight Leg Activation & Wall Slide', dose: '1 set × 6 slow reps', goal: 'Promote gluteal drive without lumbar hyperextension' }
              ].map(ex => (
                <div key={ex.name} className="flex items-start justify-between gap-3 rounded-xl border border-border p-4 bg-muted/20">
                  <div className="flex items-start gap-3">
                    <div className="grid h-8 w-8 place-items-center rounded-lg bg-primary/10 text-primary shrink-0 mt-0.5">
                      <Play size={15} />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-foreground">{ex.name}</h4>
                      <p className="font-mono text-[11px] text-primary mt-0.5">{ex.dose}</p>
                      <p className="text-xs text-muted-foreground mt-1">{ex.goal}</p>
                    </div>
                  </div>
                  <Badge tone="teal">Active</Badge>
                </div>
              ))}
            </div>

            <div className="pt-2 flex gap-2">
              <Button onClick={() => setLocation('/thread')} icon={MessageSquare} className="text-xs">
                Open Patient Consultation Thread
              </Button>
            </div>
          </Panel>
        </div>

        {/* Right Column: Physio Feedback Console */}
        <div className="space-y-6">
          <Panel className="p-6 space-y-4">
            <SectionLabel><ClipboardCheck size={14} /> Module 13 · Session Feedback Loop</SectionLabel>
            <h4 className="text-base font-bold text-foreground">Submit Post-Session Feedback</h4>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Notes submitted here are directly attached to Dr. Maya Chen's consultation timeline for shared continuity.
            </p>

            <div className="space-y-3 pt-1">
              <label className="block text-xs font-bold text-foreground">Patient Tolerance Level</label>
              <div className="grid grid-cols-3 gap-2">
                {(['Optimal', 'Mild Discomfort', 'Intolerant'] as const).map(tol => (
                  <button
                    key={tol}
                    type="button"
                    onClick={() => setSessionTolerance(tol)}
                    className={`rounded-xl border p-2 text-xs font-bold transition-all ${
                      sessionTolerance === tol
                        ? tol === 'Intolerant'
                          ? 'border-destructive bg-destructive text-destructive-foreground'
                          : 'border-primary bg-primary text-primary-foreground'
                        : 'border-border bg-card hover:bg-muted text-muted-foreground'
                    }`}
                  >
                    {tol}
                  </button>
                ))}
              </div>

              <div>
                <label className="block text-xs font-bold text-foreground mb-1">Clinical Observation Notes</label>
                <textarea
                  value={sessionNote}
                  onChange={e => setSessionNote(e.target.value)}
                  placeholder="e.g. Lumbar flexion improved by 15 degrees. No radicular symptoms observed..."
                  className="min-h-24 w-full rounded-xl border border-border bg-background p-3 text-xs outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>

              <Button
                onClick={() => {
                  setFeedbackSent(true);
                  setTimeout(() => setFeedbackSent(false), 3500);
                }}
                icon={Check}
                className="w-full text-xs"
              >
                Send Feedback to Doctor Thread
              </Button>

              {feedbackSent && (
                <p className="text-xs font-bold text-primary text-center">
                  ✓ Session feedback attached to Case SK-2048 consultation record.
                </p>
              )}
            </div>
          </Panel>
        </div>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------
   BOOKING PAGE (SEARCHABLE DOCTOR DIRECTORY & SCHEDULING)
-------------------------------------------------------------- */
interface DoctorDirectoryItem {
  id: string;
  name: string;
  specialty: string;
  subSpecialty: string;
  qualifications: string;
  experience: string;
  rating: number;
  reviewsCount: number;
  location: string;
  distance: string;
  consultationFee: string;
  initials: string;
  availableSlots: string[];
}

const verifiedDoctorsList: DoctorDirectoryItem[] = [
  {
    id: 'dr-maya',
    name: 'Dr. Maya Chen',
    specialty: 'Orthopedic Spine & Lower Limb Specialist',
    subSpecialty: 'Spinal biomechanics, paraspinal strain, lumbar disk rehabilitation',
    qualifications: 'MBBS, FCPS (Orthopedics), Fellowship Spine (CA)',
    experience: '12 years exp',
    rating: 4.9,
    reviewsCount: 142,
    location: 'Shifa International Care Hub · Blue Area, Islamabad',
    distance: '2.4 km away',
    consultationFee: '$48.00',
    initials: 'MC',
    availableSlots: ['Tomorrow 09:30 AM', 'Tomorrow 11:00 AM', 'Thursday 02:30 PM']
  },
  {
    id: 'dr-tariq',
    name: 'Dr. Tariq Mehmood',
    specialty: 'Consultant Musculoskeletal & Sports Surgeon',
    subSpecialty: 'Rotator cuff, shoulder impingement, sports ligament injury',
    qualifications: 'MBBS, FRCS (Tr & Orth), AO Spine Fellow',
    experience: '15 years exp',
    rating: 4.8,
    reviewsCount: 198,
    location: 'Islamabad Specialist Clinic · F-8 Markaz',
    distance: '3.8 km away',
    consultationFee: '$50.00',
    initials: 'TM',
    availableSlots: ['Tomorrow 12:00 PM', 'Wednesday 03:00 PM', 'Thursday 10:30 AM']
  },
  {
    id: 'dr-fatima',
    name: 'Dr. Fatima Zahra',
    specialty: 'Physical Medicine & Rehabilitation Specialist (Physiatrist)',
    subSpecialty: 'Myofascial trigger points, chronic lumbar pain, non-surgical rehab',
    qualifications: 'MBBS, FCPS (Physical Medicine & Rehabilitation)',
    experience: '9 years exp',
    rating: 4.9,
    reviewsCount: 114,
    location: 'Advanced MSK Center · Sector G-8, Islamabad',
    distance: '4.1 km away',
    consultationFee: '$42.00',
    initials: 'FZ',
    availableSlots: ['Today 05:00 PM', 'Tomorrow 10:00 AM', 'Friday 04:00 PM']
  },
  {
    id: 'dr-bilal',
    name: 'Dr. Bilal Siddiqui',
    specialty: 'Orthopedic Trauma & Joint Reconstruction',
    subSpecialty: 'Knee patellar tendinopathy, meniscus assessment, ankle trauma',
    qualifications: 'MBBS, MS Orthopedics, Arthroscopy Fellow',
    experience: '14 years exp',
    rating: 4.7,
    reviewsCount: 89,
    location: 'Rawalpindi Joint Care Pavilion · Saddar, Rawalpindi',
    distance: '8.5 km away',
    consultationFee: '$45.00',
    initials: 'BS',
    availableSlots: ['Tomorrow 04:30 PM', 'Thursday 11:30 AM', 'Saturday 10:00 AM']
  }
];

function BookingPage({ setLocation }: { setLocation: (path: string) => void }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSpecialty, setSelectedSpecialty] = useState('All');
  const [selectedDoctorId, setSelectedDoctorId] = useState('dr-maya');
  const [selectedSlot, setSelectedSlot] = useState('Tomorrow 09:30 AM');
  const [confirmed, setConfirmed] = useState(false);

  // Filtered doctors based on search & filter
  const filteredDoctors = useMemo(() => {
    return verifiedDoctorsList.filter(doc => {
      const matchesSearch =
        doc.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        doc.specialty.toLowerCase().includes(searchQuery.toLowerCase()) ||
        doc.subSpecialty.toLowerCase().includes(searchQuery.toLowerCase()) ||
        doc.location.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesSpecialty =
        selectedSpecialty === 'All' ||
        (selectedSpecialty === 'Spine & Back' && doc.specialty.includes('Spine')) ||
        (selectedSpecialty === 'Shoulder & Sports' && doc.specialty.includes('Sports')) ||
        (selectedSpecialty === 'Rehab & Physiatry' && doc.specialty.includes('Rehabilitation')) ||
        (selectedSpecialty === 'Knee & Joint' && doc.specialty.includes('Joint'));

      return matchesSearch && matchesSpecialty;
    });
  }, [searchQuery, selectedSpecialty]);

  const activeDoctor = verifiedDoctorsList.find(d => d.id === selectedDoctorId) || verifiedDoctorsList[0];

  return (
    <div className="mx-auto max-w-5xl animate-rise space-y-6">
      <button onClick={() => setLocation('/')} className="inline-flex items-center gap-2 text-sm font-bold text-muted-foreground hover:text-foreground">
        <ArrowLeft size={16} /> Back to Home
      </button>

      <PageHeader
        eyebrow="Doctor Directory & In-Person Appointment Scheduling"
        title="Find & Schedule with Available Specialists"
        detail="Search verified orthopedic surgeons, spine specialists, and physiatrists with live slot selection."
        action={<Badge tone="teal"><BadgeCheck size={14} /> PMDC Verified Registry</Badge>}
      />

      {confirmed ? (
        <Panel className="p-8 text-center space-y-4">
          <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-primary text-primary-foreground">
            <Check size={32} />
          </div>
          <h3 className="text-2xl font-bold text-foreground">Appointment Confirmed with {activeDoctor.name}!</h3>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            {selectedSlot} · {activeDoctor.location}. Your muscle intake profile and red-flag screening data are linked to this visit.
          </p>
          <div className="pt-2 flex justify-center gap-3">
            <Button onClick={() => setLocation('/thread')} icon={MessageSquare}>
              Open Care Thread
            </Button>
            <Button variant="secondary" onClick={() => setLocation('/')} icon={ArrowLeft}>
              Return to Dashboard
            </Button>
          </div>
        </Panel>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[1.25fr_.75fr]">
          {/* Left Column: Doctor Search, Filters & List */}
          <div className="space-y-4">
            {/* Search Bar & Specialty Filters */}
            <Panel className="p-4 space-y-3">
              <div className="relative">
                <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Search doctors by name, spine, shoulder, knee, or clinic location…"
                  className="min-h-12 w-full rounded-xl border border-border bg-background pl-10 pr-4 text-xs outline-none focus:ring-2 focus:ring-primary/20 placeholder:text-muted-foreground font-medium"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground text-xs"
                  >
                    Clear
                  </button>
                )}
              </div>

              {/* Specialty Chips */}
              <div className="flex flex-wrap gap-1.5 pt-1">
                {['All', 'Spine & Back', 'Shoulder & Sports', 'Rehab & Physiatry', 'Knee & Joint'].map(spec => (
                  <button
                    key={spec}
                    type="button"
                    onClick={() => setSelectedSpecialty(spec)}
                    className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                      selectedSpecialty === spec
                        ? 'bg-primary text-primary-foreground font-bold shadow-sm'
                        : 'bg-muted/40 text-muted-foreground hover:bg-muted hover:text-foreground'
                    }`}
                  >
                    {spec}
                  </button>
                ))}
              </div>
            </Panel>

            {/* Doctors List */}
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs text-muted-foreground px-1">
                <span>Showing <strong>{filteredDoctors.length}</strong> available specialists</span>
                <span>Select a doctor to view slots</span>
              </div>

              {filteredDoctors.length === 0 ? (
                <Panel className="p-8 text-center text-muted-foreground">
                  <p className="text-sm font-semibold">No doctors found matching "{searchQuery}".</p>
                  <Button variant="secondary" className="mt-3 text-xs" onClick={() => { setSearchQuery(''); setSelectedSpecialty('All'); }}>
                    Reset Search Filters
                  </Button>
                </Panel>
              ) : (
                filteredDoctors.map(doc => {
                  const isSelected = doc.id === selectedDoctorId;
                  return (
                    <div
                      key={doc.id}
                      onClick={() => {
                        setSelectedDoctorId(doc.id);
                        setSelectedSlot(doc.availableSlots[0]);
                      }}
                      className={`cursor-pointer rounded-2xl border p-5 transition-all ${
                        isSelected
                          ? 'border-primary bg-primary/5 ring-2 ring-primary/20 shadow-clinic'
                          : 'border-border bg-card hover:border-primary/40 hover:bg-muted/20'
                      }`}
                    >
                      <div className="flex items-start gap-4">
                        <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-sidebar font-bold text-sidebar-primary text-base">
                          {doc.initials}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <h4 className="font-bold text-base text-foreground">{doc.name}</h4>
                              <Badge tone="teal">Verified</Badge>
                            </div>
                            <span className="font-mono text-xs font-bold text-primary">{doc.consultationFee}</span>
                          </div>

                          <p className="text-xs font-semibold text-primary mt-0.5">{doc.specialty}</p>
                          <p className="text-[11px] text-muted-foreground mt-1 line-clamp-1">{doc.subSpecialty}</p>
                          <p className="text-[11px] text-muted-foreground font-mono mt-0.5">{doc.qualifications} · {doc.experience}</p>

                          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-border/70 pt-2.5 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1 font-semibold text-foreground">
                              ⭐ {doc.rating} <span className="font-normal text-muted-foreground">({doc.reviewsCount} reviews)</span>
                            </span>
                            <span>📍 {doc.distance} · {doc.location.split('·')[0]}</span>
                          </div>

                          {/* Quick Slot Preview for Selected Doctor */}
                          {isSelected && (
                            <div className="mt-3 pt-2.5 border-t border-primary/20">
                              <span className="block text-[11px] font-bold uppercase text-primary mb-1.5">
                                Select Available Slot:
                              </span>
                              <div className="flex flex-wrap gap-1.5">
                                {doc.availableSlots.map(slot => (
                                  <button
                                    key={slot}
                                    type="button"
                                    onClick={e => {
                                      e.stopPropagation();
                                      setSelectedSlot(slot);
                                    }}
                                    className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition-all ${
                                      selectedSlot === slot
                                        ? 'bg-primary text-primary-foreground shadow-sm font-bold'
                                        : 'bg-card border border-border text-foreground hover:bg-muted'
                                    }`}
                                  >
                                    {slot}
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Right Column: Appointment Summary Card */}
          <div className="space-y-4">
            <Panel className="p-6 h-fit space-y-5 sticky top-24">
              <SectionLabel><ClipboardCheck size={14} /> Appointment Summary</SectionLabel>

              <div className="rounded-xl bg-sidebar p-5 text-sidebar-foreground space-y-3">
                <span className="font-mono text-[10px] uppercase tracking-wider text-sidebar-primary">
                  Selected Specialist
                </span>
                <h3 className="text-xl font-bold">{activeDoctor.name}</h3>
                <p className="text-xs opacity-75">{activeDoctor.specialty}</p>

                <div className="border-t border-sidebar-border pt-3 space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="opacity-70">Slot:</span>
                    <strong className="text-sidebar-primary">{selectedSlot}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="opacity-70">Clinic:</span>
                    <strong className="text-right text-[11px] max-w-[180px] truncate">{activeDoctor.location}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="opacity-70">Experience:</span>
                    <strong>{activeDoctor.experience}</strong>
                  </div>
                  <div className="flex justify-between border-t border-sidebar-border pt-2 text-sm">
                    <span className="opacity-70">Fee:</span>
                    <strong className="text-lg text-sidebar-primary">{activeDoctor.consultationFee}</strong>
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-primary/20 bg-primary/5 p-3.5 text-xs text-muted-foreground leading-relaxed">
                <strong className="text-foreground">Connected Intake Data:</strong> Your muscle map, initial screening, and AI cross-questioning notes will be instantly delivered to {activeDoctor.name}.
              </div>

              <Button
                className="w-full text-sm"
                onClick={() => setConfirmed(true)}
                icon={Check}
                testId="button-confirm-doctor-appointment"
              >
                Confirm Appointment ({selectedSlot})
              </Button>
            </Panel>
          </div>
        </div>
      )}
    </div>
  );
}

/* -------------------------------------------------------------
   VERIFICATION PAGE
-------------------------------------------------------------- */
function VerificationPage() {
  return (
    <div className="mx-auto max-w-3xl animate-rise space-y-6">
      <PageHeader
        eyebrow="Module 8 · Trust & Credential Layer"
        title="Verified Medical Specialists"
        detail="Doctor verification details and credentials."
      />
      <Panel className="p-6">
        <h3 className="text-lg font-bold">Dr. Maya Chen (PMDC Reg # 49201-B)</h3>
        <p className="text-xs text-muted-foreground mt-1">Orthopedic Surgeon · Credentialed for async and in-person consultations.</p>
      </Panel>
    </div>
  );
}

/* -------------------------------------------------------------
   PATIENT DASHBOARD (HOME)
-------------------------------------------------------------- */
function PatientDashboard({ setLocation }: { setLocation: (path: string) => void }) {
  const entryCards = [
    {
      id: 'report-symptom',
      title: 'Report a Symptom',
      subtitle: 'Muscular Model Pinpoint + Safety Check',
      copy: 'Pinpoint on the anatomical body map. AI asks targeted questions, recommends exercises/diet, and checks red flags.',
      icon: AlertCircle,
      tone: 'coral' as const,
      path: '/intake',
      actionText: 'Start Symptom Report'
    },
    {
      id: 'care-thread',
      title: 'My Care & Chat',
      subtitle: 'Doctor Thread + Lab Reports',
      copy: 'Chat with Dr. Maya Chen, submit your lab/X-ray reports, and view personalized guidance.',
      icon: MessageSquare,
      tone: 'teal' as const,
      path: '/thread',
      actionText: 'Open Care Conversation'
    },
    {
      id: 'follow-up',
      title: '24h Follow-up Check',
      subtitle: 'Condition Progress Check-in',
      copy: 'Check in on your recovery 24 hours later. Notify doctor if symptoms are better, stable, or worse.',
      icon: RefreshCw,
      tone: 'lime' as const,
      path: '/follow-up',
      actionText: 'Check Condition Now'
    }
  ];

  return (
    <div className="mx-auto max-w-5xl animate-rise space-y-8">
      <PageHeader
        eyebrow="Patient Care Command"
        title={<>Simple, Clear Healthcare For <span className="text-primary">Everyone.</span></>}
        detail="A clean, easy-to-use health prototype. Select an option below to begin your care journey."
        action={<Badge tone="teal"><ShieldCheck size={14} /> Medical Grade Triage</Badge>}
      />

      <div className="grid gap-6 md:grid-cols-3">
        {entryCards.map(card => {
          const Icon = card.icon;
          return (
            <button
              key={card.id}
              onClick={() => setLocation(card.path)}
              className="group flex flex-col justify-between rounded-2xl border border-border bg-card p-6 text-left transition-all hover:-translate-y-1 hover:border-primary hover:shadow-clinic-lg"
            >
              <div>
                <div className={`grid h-12 w-12 place-items-center rounded-xl ${
                  card.tone === 'coral' ? 'bg-destructive/10 text-destructive' :
                  card.tone === 'lime' ? 'bg-accent text-accent-foreground' : 'bg-primary/10 text-primary'
                }`}>
                  <Icon size={22} />
                </div>
                <h3 className="mt-4 text-lg font-bold text-foreground group-hover:text-primary transition-colors">
                  {card.title}
                </h3>
                <p className="text-xs font-semibold text-primary mt-0.5">{card.subtitle}</p>
                <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{card.copy}</p>
              </div>

              <div className="mt-6 flex items-center justify-between border-t border-border/70 pt-3 text-sm font-bold text-foreground group-hover:text-primary">
                <span>{card.actionText}</span>
                <ArrowRight size={18} className="transition-transform group-hover:translate-x-1" />
              </div>
            </button>
          );
        })}
      </div>

      <div className="rounded-2xl border border-primary/20 bg-primary/5 p-5 flex items-start gap-4">
        <ShieldCheck className="mt-0.5 shrink-0 text-primary" size={22} />
        <div>
          <h4 className="text-sm font-bold text-foreground">Safety First Guarantee</h4>
          <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
            All AI suggestions are reviewed by credentialed doctors. Red flags automatically escalate to direct appointment booking.
          </p>
        </div>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------
   LOGIN PAGE (CLEAN, ACCESSIBLE, DEMO ACCOUNT SELECTOR)
-------------------------------------------------------------- */
interface UserAccount {
  email: string;
  name: string;
  role: Role;
  title: string;
  avatar: string;
}

const demoAccounts: UserAccount[] = [
  {
    email: 'aisha.patient@shifakinetix.care',
    name: 'Aisha Rahman',
    role: 'patient',
    title: 'Registered Patient',
    avatar: 'AR'
  },
  {
    email: 'dr.maya.chen@shifakinetix.care',
    name: 'Dr. Maya Chen',
    role: 'doctor',
    title: 'Consultant Orthopedic Surgeon (MBBS, FCPS)',
    avatar: 'MC'
  },
  {
    email: 'leo.martins@shifakinetix.care',
    name: 'Leo Martins',
    role: 'physio',
    title: 'Lead MSK Physiotherapist (DPT)',
    avatar: 'LM'
  }
];

function LoginPage({
  onLogin
}: {
  onLogin: (account: UserAccount) => void;
}) {
  const [selectedEmail, setSelectedEmail] = useState(demoAccounts[0].email);
  const activeAcc = demoAccounts.find(a => a.email === selectedEmail) || demoAccounts[0];

  const handleSignIn = (e: React.FormEvent) => {
    e.preventDefault();
    onLogin(activeAcc);
  };

  return (
    <div className="min-h-[100dvh] flex items-center justify-center bg-background px-4 py-12">
      <div className="w-full max-w-md animate-rise space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-sidebar text-sidebar-primary shadow-sm">
            <Activity size={32} strokeWidth={2.5} />
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            Shifa<span className="text-primary">Kinetix</span>
          </h1>
          <p className="text-xs font-mono uppercase tracking-[.2em] text-muted-foreground">
            Clinical Care & Triage Platform
          </p>
        </div>

        {/* Clean Login Card */}
        <Panel className="p-8 shadow-clinic-lg space-y-6">
          <div className="space-y-1 text-center">
            <h2 className="text-xl font-bold text-foreground">Sign In to Your Workspace</h2>
            <p className="text-xs text-muted-foreground">
              Select your registered email account to enter the secure portal.
            </p>
          </div>

          <form onSubmit={handleSignIn} className="space-y-4">
            {/* Demo Account Dropdown */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
                Select Account / Email
              </label>
              <select
                value={selectedEmail}
                onChange={e => setSelectedEmail(e.target.value)}
                className="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-xs font-semibold text-foreground outline-none focus:ring-2 focus:ring-primary/20"
              >
                <option value="aisha.patient@shifakinetix.care">
                  Patient Account · aisha.patient@shifakinetix.care
                </option>
                <option value="dr.maya.chen@shifakinetix.care">
                  Doctor Account · dr.maya.chen@shifakinetix.care
                </option>
                <option value="leo.martins@shifakinetix.care">
                  Physiotherapist Account · leo.martins@shifakinetix.care
                </option>
              </select>
            </div>

            {/* Selected User Badge */}
            <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 flex items-center gap-3.5">
              <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-sidebar text-sidebar-primary font-bold text-sm">
                {activeAcc.avatar}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-bold text-foreground">{activeAcc.name}</h4>
                  <Badge tone={activeAcc.role === 'doctor' ? 'coral' : activeAcc.role === 'physio' ? 'lime' : 'teal'}>
                    {activeAcc.role}
                  </Badge>
                </div>
                <p className="text-[11px] text-muted-foreground truncate">{activeAcc.title}</p>
                <p className="text-[10px] font-mono text-primary truncate mt-0.5">{activeAcc.email}</p>
              </div>
            </div>

            {/* Password input preview */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
                Security Passcode
              </label>
              <input
                type="password"
                defaultValue="••••••••••••"
                readOnly
                className="w-full rounded-xl border border-border bg-muted/30 px-3.5 py-2.5 text-xs font-mono text-muted-foreground outline-none cursor-not-allowed"
              />
              <p className="text-[10px] text-muted-foreground mt-1">Pre-authenticated for prototype demonstration</p>
            </div>

            <Button type="submit" className="w-full mt-2" icon={Check} testId="button-signin">
              Sign In as {activeAcc.name} ({activeAcc.role.toUpperCase()})
            </Button>
          </form>

          <div className="pt-2 border-t border-border text-center">
            <p className="text-[11px] text-muted-foreground flex items-center justify-center gap-1.5">
              <ShieldCheck size={14} className="text-primary" /> HIPAA & FDA Non-Device CDS Aligned
            </p>
          </div>
        </Panel>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------
   ROUTER & APP ROOT
-------------------------------------------------------------- */
function Router({
  role,
  setRole,
  currentUser,
  setCurrentUser,
  consultation,
  setConsultation
}: {
  role: Role;
  setRole: (role: Role) => void;
  currentUser: UserAccount | null;
  setCurrentUser: (acc: UserAccount | null) => void;
  consultation: ConsultationState;
  setConsultation: (state: ConsultationState) => void;
}) {
  const [location, setLocation] = useLocation();

  // If not logged in, render the clean Login Page
  if (!currentUser) {
    return (
      <LoginPage
        onLogin={acc => {
          setCurrentUser(acc);
          setRole(acc.role);
          if (acc.role === 'patient') setLocation('/');
          else if (acc.role === 'doctor') setLocation('/doctor');
          else setLocation('/physio');
        }}
      />
    );
  }

  const page = (() => {
    if (location === '/') return <PatientDashboard setLocation={setLocation} />;
    if (location === '/intake') return <IntakePage setLocation={setLocation} onSave={setConsultation} />;
    if (location === '/booking') return <BookingPage setLocation={setLocation} />;
    if (location === '/thread') return <ThreadPage setLocation={setLocation} consultation={consultation} onUpdateConsultation={setConsultation} />;
    if (location === '/follow-up') return <FollowUpPage setLocation={setLocation} consultation={consultation} onUpdateConsultation={setConsultation} />;
    if (location === '/doctor') return <DoctorDashboard setLocation={setLocation} consultation={consultation} />;
    if (location === '/physio') return <PhysioDashboard setLocation={setLocation} />;
    if (location === '/verification') return <VerificationPage />;
    return <NotFound />;
  })();

  return (
    <Shell
      role={role}
      setRole={r => {
        setRole(r);
        const match = demoAccounts.find(a => a.role === r) || demoAccounts[0];
        setCurrentUser(match);
      }}
    >
      <div className="mb-4 flex items-center justify-between rounded-xl border border-border/70 bg-card/60 px-4 py-2 text-xs">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-primary" />
          <span>Signed in as <strong>{currentUser.name}</strong> ({currentUser.email})</span>
        </div>
        <button
          onClick={() => setCurrentUser(null)}
          className="text-xs font-bold text-destructive hover:underline"
        >
          Sign Out
        </button>
      </div>
      {page}
    </Shell>
  );
}

function App() {
  const [role, setRole] = useState<Role>('patient');
  const [currentUser, setCurrentUser] = useState<UserAccount | null>(demoAccounts[0]);
  const [consultation, setConsultation] = useState<ConsultationState>(defaultConsultation);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <ErrorBoundary resetKey={role}>
          <Router
            role={role}
            setRole={setRole}
            currentUser={currentUser}
            setCurrentUser={setCurrentUser}
            consultation={consultation}
            setConsultation={setConsultation}
          />
        </ErrorBoundary>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;