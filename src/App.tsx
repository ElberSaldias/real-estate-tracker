import { useState, useMemo, useRef, useEffect } from 'react'
import jsPDF from 'jspdf'
import html2canvas from 'html2canvas'
import {
    BarChart,
    Search,
    Filter,
    ChevronDown,
    Home,
    LayoutDashboard,
    Layers,
    Settings,
    Bell,
    User,
    Plus,
    ArrowRight,
    MoreVertical,
    CheckCircle2,
    Clock,
    AlertCircle,
    Construction,
    MapPin,
    Eye,
    Download,
    UserX,
    Building2,
    FileText,
    RefreshCw,
    Users,
    Camera,
    Book,
    Key,
    PhoneCall,
    Moon,
    Sun,
    HardHat,
    MessageSquare,
    X
} from 'lucide-react'



// Types
type UnitStatus = 'E' | 'LE' | 'OBS' | 'DL' | 'SV' | 'R1' | 'R2' | 'R3' | 'S/R' | 'R0' | 'RECEPCIONADO' | 'REC';

interface Unit {
    id: string;
    number: string;
    floor: number;
    status: UnitStatus;
    type: 'DEPARTAMENTO' | 'BODEGA' | 'ESTACIONAMIENTO';
    lastVisit?: string;
    responsible?: string;
    storageNumber?: string;
    parkingNumber?: string;
    proceso_status?: string;
    tipo_proceso?: string;
    observaciones?: any;
    fecha_obs?: string;
    // Spanish aliases for incoming data
    bodega?: string;
    estacionamiento?: string;
    responsable?: string;
    propietario?: string;
    link_acta?: string;
}

interface Project {
    id: string;
    name: string;
    location: string;
    units: number;
    progress: number;
    image: string;
    gasUrl?: string;
    stage: 'CONSTRUCCION' | 'ENTREGA';
}

const PROJECTS: Project[] = [
    {
        id: 'carvajal-330',
        name: 'Carvajal 330',
        location: 'Comuna de la Cisterna',
        units: 246,
        progress: 15,
        image: '/projects/carvajal-330-v2.png',
        gasUrl: 'https://script.google.com/macros/s/AKfycbyMiUHLZKGgQ7VDq22nXna9mCOeap2c8TDpwXgXVWDPcYzXlGLWTGKS2xfMoEFbm6JeZw/exec',
        stage: 'ENTREGA'
    },
    {
        id: 'san-ignacio',
        name: 'San Ignacio Lazcano',
        location: 'Comuna de San Miguel',
        units: 129,
        progress: 28,
        image: '/projects/san-ignacio-lazcano-v2.png',
        gasUrl: 'https://script.google.com/macros/s/AKfycbz0c_bGXRJdb3OUPmp1W0eGyuT8WiFWBALbYMJfR4lEq7wH9yapIIRts0l0ytlFamuAsw/exec',
        stage: 'ENTREGA'
    },
    {
        id: 'don-claudio',
        name: 'Don Claudio',
        location: 'Comuna de la Cisterna',
        units: 194,
        progress: 45,
        image: '/projects/don-claudio-v2.png',
        gasUrl: 'https://script.google.com/macros/s/AKfycbzEac1346p4jIrv9vROOCkgygciil66-b_n64PzuMGVK9NxyPc4oXMJh4exg27BeOF1Mw/exec',
        stage: 'ENTREGA'
    },
    {
        id: 'don-diego',
        name: 'DON DIEGO',
        location: 'Temuco, Chile',
        units: 150,
        progress: 10,
        image: '/projects/don-diego.png',
        gasUrl: 'https://script.google.com/macros/s/AKfycbzR-a8PHxpYbdJ9KOD0ABAN8IvBjqLyrzmc9EqRyRdqQqJl7hpB120ajpbTeZLoh297VQ/exec',
        // Alternate/New URL (currently returning []): https://script.google.com/macros/s/AKfycbyP9nwBI3Vms9jCJMTZNOY9GrL0ObmIHMAwTZxT4bswt24JdMXQwQrMK9h-HLtZnxAjMA/exec
        stage: 'CONSTRUCCION'
    }
];

const calculateBusinessDays = (startDate: Date, endDate: Date) => {
    let count = 0;
    const curDate = new Date(startDate.getTime());
    curDate.setHours(0, 0, 0, 0);
    const finalDate = new Date(endDate.getTime());
    finalDate.setHours(0, 0, 0, 0);

    const isReverse = finalDate < curDate;
    const start = isReverse ? finalDate : curDate;
    const end = isReverse ? curDate : finalDate;

    // Fixed Chilean holidays
    const holidays = [
        '01-01', '05-01', '05-21', '06-29', '07-16',
        '08-15', '09-18', '09-19', '10-12', '10-31',
        '11-01', '12-08', '12-25'
    ];

    const tempDate = new Date(start.getTime());
    while (tempDate <= end) {
        const dayOfWeek = tempDate.getDay();
        const mmdd = `${String(tempDate.getMonth() + 1).padStart(2, '0')}-${String(tempDate.getDate()).padStart(2, '0')}`;

        // 0 = Sunday, 6 = Saturday
        if (dayOfWeek !== 0 && dayOfWeek !== 6 && !holidays.includes(mmdd)) {
            count++;
        }
        tempDate.setDate(tempDate.getDate() + 1);
    }
    return count;
};

const STATUS_CONFIG: Record<string, { label: string, short: string, color: string, bg: string }> = {
    'E': { label: 'ENTREGADO', short: 'E', color: 'text-green-600', bg: 'bg-green-500' },
    'ENTREGADO': { label: 'ENTREGADO', short: 'E', color: 'text-green-600', bg: 'bg-green-500' },
    'MI': { label: 'ENTREGADO', short: 'E', color: 'text-green-600', bg: 'bg-green-500' },
    'LE': { label: 'LISTO PARA ENTREGA', short: 'LE', color: 'text-blue-600', bg: 'bg-blue-500' },
    'LISTO PARA ENTREGA': { label: 'LISTO PARA ENTREGA', short: 'LE', color: 'text-blue-600', bg: 'bg-blue-500' },
    'OBS': { label: 'CON OBSERVACIONES', short: 'OBS', color: 'text-yellow-600', bg: 'bg-amber-500' },
    'CON OBSERVACIONES': { label: 'CON OBSERVACIONES', short: 'OBS', color: 'text-yellow-600', bg: 'bg-amber-500' },
    'OBSERVACIÓN': { label: 'CON OBSERVACIONES', short: 'OBS', color: 'text-yellow-600', bg: 'bg-amber-500' },
    'OBSERVACION': { label: 'CON OBSERVACIONES', short: 'OBS', color: 'text-yellow-600', bg: 'bg-amber-500' },
    'SV': { label: 'SIN VISITA', short: 'SV', color: 'text-gray-600', bg: 'bg-gray-400' },
    'SIN VISITA': { label: 'SIN VISITA', short: 'SV', color: 'text-gray-600', bg: 'bg-gray-400' },
    'DL': { label: 'DEPARTAMENTO LIBRE', short: 'DL', color: 'text-slate-600', bg: 'bg-slate-300' },
    'DEPARTAMENTO LIBRE': { label: 'DEPARTAMENTO LIBRE', short: 'DL', color: 'text-slate-600', bg: 'bg-slate-300' },
};

const CONSTRUCTION_STATUS_CONFIG: Record<string, { label: string, short: string, color: string, bg: string }> = {
    'R0': { label: 'SIN INICIAR', short: 'R0', color: 'text-gray-400', bg: 'bg-white dark:bg-zinc-800 border-2 border-gray-100 dark:border-zinc-700 shadow-sm' },
    'R1': { label: 'PRIMERA REVISIÓN', short: 'R1', color: 'text-white', bg: 'bg-red-500' },
    'R2': { label: 'SEGUNDA REVISIÓN', short: 'R2', color: 'text-white', bg: 'bg-orange-500' },
    'R3': { label: 'TERCERA REVISIÓN', short: 'R3', color: 'text-gray-900', bg: 'bg-yellow-400' },
    'REC': { label: 'RECEPCIONADO', short: 'REC', color: 'text-white', bg: 'bg-green-500' },
    'RECEPCIONADO': { label: 'RECEPCIONADO', short: 'REC', color: 'text-white', bg: 'bg-green-500' },
};

const generateProjectData = (projectId: string) => {
    if (projectId === 'carvajal-330') {
        return Array.from({ length: 21 }, (_, i) => {
            const floor = 21 - i;
            if (floor === 1) {
                return {
                    floor,
                    units: ['02', '03', '05', '06', '07', '08'].map(num => ({
                        id: `1${num}`,
                        number: `1${num}`,
                        floor,
                        status: ['E', 'LE', 'OBS', 'SV', 'DL'][Math.floor(Math.random() * 5)] as UnitStatus,
                        type: 'DEPARTAMENTO' as const,
                        storageNumber: `B-${Math.floor(Math.random() * 200) + 1}`,
                        parkingNumber: `E-${Math.floor(Math.random() * 200) + 1}`
                    }))
                };
            }
            return {
                floor,
                units: Array.from({ length: 12 }, (_, j) => ({
                    id: `${floor}${String(j + 1).padStart(2, '0')}`,
                    number: `${floor}${String(j + 1).padStart(2, '0')}`,
                    floor,
                    status: ['E', 'LE', 'OBS', 'SV', 'DL'][Math.floor(Math.random() * 5)] as UnitStatus,
                    type: 'DEPARTAMENTO' as const,
                    storageNumber: `B-${Math.floor(Math.random() * 200) + 1}`,
                    parkingNumber: `E-${Math.floor(Math.random() * 200) + 1}`
                }))
            };
        });
    }

    if (projectId === 'san-ignacio') {
        return Array.from({ length: 19 }, (_, i) => {
            const floor = 19 - i;
            if (floor === 1) {
                return {
                    floor,
                    units: ['02', '03'].map(num => ({
                        id: `1${num}`,
                        number: `1${num}`,
                        floor,
                        status: ['E', 'LE', 'OBS', 'SV', 'DL'][Math.floor(Math.random() * 5)] as UnitStatus,
                        type: 'DEPARTAMENTO' as const,
                        storageNumber: `B-${Math.floor(Math.random() * 150) + 1}`,
                        parkingNumber: `E-${Math.floor(Math.random() * 150) + 1}`
                    }))
                };
            }
            return {
                floor,
                units: Array.from({ length: 7 }, (_, j) => ({
                    id: `${floor}${String(j + 1).padStart(2, '0')}`,
                    number: `${floor}${String(j + 1).padStart(2, '0')}`,
                    floor,
                    status: ['E', 'LE', 'OBS', 'SV', 'DL'][Math.floor(Math.random() * 5)] as UnitStatus,
                    type: 'DEPARTAMENTO' as const,
                    storageNumber: `B-${Math.floor(Math.random() * 150) + 1}`,
                    parkingNumber: `E-${Math.floor(Math.random() * 150) + 1}`
                }))
            };
        });
    }

    if (projectId === 'don-claudio') {
        return Array.from({ length: 12 }, (_, i) => {
            const floor = 12 - i;
            if (floor === 1) {
                return {
                    floor,
                    units: ['01', '02', '03', '04', '05', '06', '07'].map(num => ({
                        id: `1${num}`,
                        number: `1${num}`,
                        floor,
                        status: ['E', 'LE', 'OBS', 'SV', 'DL'][Math.floor(Math.random() * 5)] as UnitStatus,
                        type: 'DEPARTAMENTO' as const,
                        storageNumber: `B-${Math.floor(Math.random() * 200) + 1}`,
                        parkingNumber: `E-${Math.floor(Math.random() * 200) + 1}`
                    }))
                };
            }
            return {
                floor,
                units: Array.from({ length: 17 }, (_, j) => ({
                    id: `${floor}${String(j + 1).padStart(2, '0')}`,
                    number: `${floor}${String(j + 1).padStart(2, '0')}`,
                    floor,
                    status: ['E', 'LE', 'OBS', 'SV', 'DL'][Math.floor(Math.random() * 5)] as UnitStatus,
                    type: 'DEPARTAMENTO' as const,
                    storageNumber: `B-${Math.floor(Math.random() * 200) + 1}`,
                    parkingNumber: `E-${Math.floor(Math.random() * 200) + 1}`
                }))
            };
        });
    }

    if (projectId === 'don-diego') {
        const names = ['Andrés Gómez', 'Beatriz Silva', 'Carlos Ruiz', 'Diana Torres', 'Eduardo Paz', 'Fabiola Méndez'];
        return Array.from({ length: 10 }, (_, i) => {
            const floor = 10 - i;
            return {
                floor,
                units: Array.from({ length: 15 }, (_, j) => ({
                    id: `${floor}${String(j + 1).padStart(2, '0')}`,
                    number: `${floor}${String(j + 1).padStart(2, '0')}`,
                    floor,
                    status: ['E', 'LE', 'OBS', 'SV', 'DL'][Math.floor(Math.random() * 5)] as UnitStatus,
                    type: 'DEPARTAMENTO' as const,
                    storageNumber: `B-${(floor * 15) + j + 1}`,
                    parkingNumber: `E-${(floor * 15) + j + 1}`,
                    responsible: names[Math.floor(Math.random() * names.length)]
                }))
            };
        });
    }

    return [];
};

export default function App() {
    const [view, setView] = useState<'HOME' | 'SELECT' | 'SELECT_CONSTRUCTION' | 'DASHBOARD'>('HOME');
    const [selectedProject, setSelectedProject] = useState<Project | null>(null);
    const isConstruction = selectedProject?.stage === 'CONSTRUCCION' || selectedProject?.id === 'don-diego';
    const [selectedUnit, setSelectedUnit] = useState<Unit | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterStatus, setFilterStatus] = useState<UnitStatus | 'ALL'>('ALL');
    const [activeTab, setActiveTab] = useState<'GRID' | 'TABLE' | 'OBSERVATIONS'>('GRID');
    const [activeSidebar, setActiveSidebar] = useState('dashboard');
    const [isExporting, setIsExporting] = useState(false);
    const [viewerPdfUrl, setViewerPdfUrl] = useState<string | null>(null);

    // Load and manage data in state for persistence
    const [floorsData, setFloorsData] = useState<{ floor: number | string, units: Unit[] }[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [projectsStats, setProjectsStats] = useState<Record<string, Record<string, number>>>({});
    const [isDarkMode, setIsDarkMode] = useState(false);
    const dashboardRef = useRef<HTMLDivElement>(null);

    const getStatusConfig = (status: string) => {
        const s = status.trim().toUpperCase();
        return (isConstruction ? CONSTRUCTION_STATUS_CONFIG : STATUS_CONFIG)[s] || 
               (isConstruction ? CONSTRUCTION_STATUS_CONFIG[status] : STATUS_CONFIG[status]) || 
               { label: status, short: status, bg: 'bg-gray-400', color: 'text-white' };
    };

    useEffect(() => {
        const savedProject = localStorage.getItem('selectedProjectId');
        const theme = localStorage.getItem('buildflow-theme');
        if (theme === 'dark') setIsDarkMode(true);
        
        if (savedProject) {
            const project = PROJECTS.find(p => p.id === savedProject);
            if (project) {
                setSelectedProject(project);
                fetchProjectData(project.id);
                // Allow the user to return to dashboard if they were there
                const lastView = localStorage.getItem('lastView');
                if (lastView === 'DASHBOARD') setView('DASHBOARD');
            }
        }
    }, []);

    // Apply dark mode class to body/html
    useEffect(() => {
        console.log('🌓 Theme Preference Sync:', isDarkMode ? 'DARK' : 'LIGHT');
        const root = document.documentElement;
        const body = document.body;

        if (isDarkMode) {
            root.classList.add('dark');
            body.classList.add('dark');
            localStorage.setItem('buildflow-theme', 'dark');
            console.log('✅ Dark class added to root/body');
        } else {
            root.classList.remove('dark');
            body.classList.remove('dark');
            localStorage.setItem('buildflow-theme', 'light');
            console.log('✅ Dark class removed from root/body');
        }
    }, [isDarkMode]);


    // Fetch initial stats for all projects for the SELECT view
    useEffect(() => {
        const fetchAllStats = async () => {
            const stats: Record<string, Record<string, number>> = {};

            await Promise.all(PROJECTS.map(async (project) => {
                try {
                    let projectFloors = [];
                    if (project.gasUrl) {
                        const response = await fetch(project.gasUrl);
                        if (response.ok) {
                            const data = await response.json();
                            if (Array.isArray(data) && data.length > 0 && typeof data[0].depto !== 'undefined') {
                                // Special handling for flat list of units (e.g., Don Diego construction)
                                projectFloors = [{
                                    floor: 'LISTADO',
                                    units: data.map((u: any) => ({
                                        id: String(u.depto),
                                        number: String(u.depto),
                                        floor: '0',
                                        status: String(u.revisión || u.revision || u.REVISIÓN || u.REVISION || 'S/R').trim().toUpperCase(),
                                        responsible: u.propietario || u.PROPIETARIO || 'SIN ASIGNAR',
                                        parkingNumber: [u.estacionamiento_1, u.estacionamiento_2].filter(Boolean).join(', ') || '-',
                                        storageNumber: [u.bodega_1, u.bodega_2].filter(Boolean).join(', ') || '-',
                                        observaciones: u.comentarios || u.COMENTARIOS || u.observaciones || '',
                                        type: 'DEPARTAMENTO' as const, // Default type
                                        ...u
                                    }))
                                }];
                            } else {
                                projectFloors = data;
                            }
                        }
                    } else {
                        projectFloors = generateProjectData(project.id);
                    }

                    const counts = { E: 0, LE: 0, OBS: 0, SV: 0, DL: 0, R1: 0, R2: 0, R3: 0, total: 0 };
                    projectFloors.forEach((f: any) => {
                        f.units.forEach((u: Unit) => {
                            counts.total++;
                            const statusKey = u.status.trim().toUpperCase();
                            if (statusKey in counts) {
                                counts[statusKey as keyof typeof counts]++;
                            } else if (STATUS_CONFIG[statusKey]?.short in counts) {
                                counts[STATUS_CONFIG[statusKey].short as keyof typeof counts]++;
                            }
                        });
                    });
                    stats[project.id] = counts;
                } catch (err) {
                    console.error(`Error fetching stats for ${project.id}:`, err);
                }
            }));
            setProjectsStats(stats);
        };

        if (view === 'SELECT') {
            fetchAllStats();
        }
    }, [view]);


    const fetchProjectData = async (projectId: string) => {
        const project = PROJECTS.find(p => p.id === projectId);
        if (!project?.gasUrl) {
            setFloorsData(generateProjectData(projectId));
            return;
        }

        setIsLoading(true);
        setFloorsData([]); 

        try {
            const cacheBuster = `?t=${Date.now()}`;
            const response = await fetch(project.gasUrl + cacheBuster);
            if (!response.ok) throw new Error('Error de conexión con la base de datos');
            const data = await response.json();

            let normalizedData = [];

            if (Array.isArray(data) && data.length > 0) {
                // If it's a flat list of units NOT wrapped in a floor object yet
                if (typeof data[0].units === 'undefined' || (typeof data[0].number !== 'undefined' || typeof data[0].depto !== 'undefined' || typeof data[0].unidad !== 'undefined')) {
                    // Group by floor automatically
                    const groups: Record<string, any[]> = {};
                    data.forEach((u: any) => {
                        const deptoVal = u.number || u.depto || u['depto.'] || u.DEPTO || u.unidad || u.Unidad || u.UNIDAD || u.id;
                        let floorName = String(u.floor || u.FLOOR || u.ubicacion || u.piso || u.PISO || '').trim().replace('PISO ', '');
                        
                        // Intelligent floor extraction from depto number if field is missing
                        if (!floorName && deptoVal) {
                            const dStr = String(deptoVal).replace(/[^\d]/g, '');
                            if (dStr.length === 3) floorName = dStr.charAt(0);
                            else if (dStr.length >= 4) floorName = dStr.slice(0, dStr.length - 2);
                        }
                        
                        const finalFloor = floorName || '0';
                        if (!groups[finalFloor]) groups[finalFloor] = [];
                        groups[finalFloor].push(u);
                    });

                    normalizedData = Object.entries(groups).map(([floorName, units]) => ({
                        floor: floorName.replace(/[^\d]/g, '') || floorName,
                        units: units.map((u: any) => {
                            const deptoVal = u.number || u.depto || u.departamento || u['depto.'] || u.DEPTO || u.unidad || u.Unidad || u.UNIDAD || u.id;
                            const statusVal = u.status || u.estado || u.revisión || u.revision || u.REVISIÓN || u.REVISION || u.versión || u.version || u.VERSIÓN || u.VERSION || 'R0';
                            const obsDate = u.fecha_obs || u.fecha_observacion || u['fecha de observaciones'] || u.fecha_observaciones || u['fecha observaciones'] || u.date_obs;
                            
                            return {
                                id: String(deptoVal),
                                number: String(deptoVal),
                                floor: u.piso || u.ubicacion || floorName || '0',
                                status: (String(statusVal).trim().toUpperCase() || 'R0') as UnitStatus,
                                responsible: u.propietario || u.PROPIETARIO || u.responsible || u.responsable || 'SIN ASIGNAR',
                                parkingNumber: u.estacionamiento || u.estacionamiento_1 || u['estacionamiento 1'] || [u.estacionamiento_1, u.estacionamiento_2].filter(Boolean).join(', ') || '-',
                                storageNumber: u.bodega || u.bodega_1 || u['bodega 1'] || [u.bodega_1, u.bodega_2].filter(Boolean).join(', ') || '-',
                                fecha_obs: obsDate,
                                link_acta: u.link_acta || u.acta_link || u['Link de dropbox'] || u.acta || u.Link_acta,
                                observaciones: u.comentarios || u.COMENTARIOS || u.observaciones || '',
                                type: 'DEPARTAMENTO' as const,
                                ...u
                            };
                        })
                    })).sort((a, b) => {
                        const valA = parseInt(String(a.floor)) || 0;
                        const valB = parseInt(String(b.floor)) || 0;
                        return valB - valA;
                    });
                } else {
                    // It's a list of floor objects [ { floor: '...', units: [...] }, ... ]
                    normalizedData = data.map((f: any) => ({
                        floor: f.floor || '0',
                        units: (f.units || []).map((u: any) => {
                            const deptoVal = u.number || u.depto || u.departamento || u['depto.'] || u.id || u.unidad || u.Unidad || u.UNIDAD;
                            const statusVal = u.status || u.estado || u.revisión || u.revision || u.REVISIÓN || u.REVISION || u.versión || u.version || u.VERSIÓN || u.VERSION || 'R0';
                            const obsDate = u.fecha_obs || u.fecha_observacion || u['fecha de observaciones'] || u.fecha_observaciones || u['fecha observaciones'] || u.date_obs;
                            
                            return {
                                id: String(deptoVal),
                                number: String(deptoVal),
                                floor: u.piso || u.ubicacion || f.floor || '0',
                                status: (String(statusVal).trim().toUpperCase() || 'R0') as UnitStatus,
                                responsible: u.propietario || u.PROPIETARIO || u.responsible || u.responsable || 'SIN ASIGNAR',
                                parkingNumber: u.estacionamiento || u.estacionamiento_1 || u['estacionamiento 1'] || [u.estacionamiento_1, u.estacionamiento_2].filter(Boolean).join(', ') || '-',
                                storageNumber: u.bodega || u.bodega_1 || u['bodega 1'] || [u.bodega_1, u.bodega_2].filter(Boolean).join(', ') || '-',
                                fecha_obs: obsDate,
                                link_acta: u.link_acta || u.acta_link || u['Link de dropbox'] || u.acta || u.Link_acta,
                                observaciones: u.comentarios || u.COMENTARIOS || u.observaciones || '',
                                type: 'DEPARTAMENTO' as const,
                                ...u
                            };
                        })
                    })).sort((a, b) => {
                        const valA = parseInt(String(a.floor)) || 0;
                        const valB = parseInt(String(b.floor)) || 0;
                        return valB - valA;
                    });
                }
            } else if (typeof data === 'object' && data !== null && !Array.isArray(data)) {
                // Object structure { "PISO X": [...], ... }
                normalizedData = Object.entries(data).map(([floorName, units]: [string, any]) => ({
                    floor: floorName.replace(/[^\d]/g, '') || floorName,
                    units: (Array.isArray(units) ? units : []).map((u: any) => {
                        const deptoVal = u.number || u.depto || u.departamento || u['depto.'] || u.id || u.unidad || u.Unidad || u.UNIDAD;
                        const statusVal = u.status || u.estado || u.revisión || u.revision || u.REVISIÓN || u.REVISION || u.versión || u.version || u.VERSIÓN || u.VERSION || 'R0';
                        const obsDate = u.fecha_obs || u.fecha_observacion || u['fecha de observaciones'] || u.fecha_observaciones || u['fecha observaciones'] || u.date_obs;
                        
                        return {
                            id: String(deptoVal),
                            number: String(deptoVal),
                            floor: u.piso || u.ubicacion || floorName.replace(/[^\d]/g, '') || '0',
                            status: (String(statusVal).trim().toUpperCase() || 'R0') as UnitStatus,
                            responsible: u.propietario || u.PROPIETARIO || u.responsible || u.responsable || 'SIN ASIGNAR',
                            parkingNumber: u.estacionamiento || u.estacionamiento_1 || u['estacionamiento 1'] || [u.estacionamiento_1, u.estacionamiento_2].filter(Boolean).join(', ') || '-',
                            storageNumber: u.bodega || u.bodega_1 || u['bodega 1'] || [u.bodega_1, u.bodega_2].filter(Boolean).join(', ') || '-',
                            fecha_obs: obsDate,
                            link_acta: u.link_acta || u.acta_link || u['Link de dropbox'] || u.acta || u.Link_acta,
                            observaciones: u.comentarios || u.COMENTARIOS || u.observaciones || '',
                            type: 'DEPARTAMENTO' as const,
                            ...u
                        };
                    })
                })).sort((a, b) => {
                    const valA = parseInt(String(a.floor)) || 0;
                    const valB = parseInt(String(b.floor)) || 0;
                    return valB - valA;
                });
            } else {
                throw new Error('La API respondió éxitosamente pero no se encontraron departamentos registrados.');
            }

            console.log(`Don Diego DB Sync: ${normalizedData.length} pisos procesados`);
            setFloorsData(normalizedData);
        } catch (error) {
            console.error('Error synchronizing:', error);
            // Help the user with a specific message if data is []
            const msg = error instanceof Error && error.message.includes('encontraron') 
                ? error.message 
                : `Error de sincronización con Apps Script.\n\nPor favor verifica que la hoja de cálculo de Don Diego no esté vacía y que las columnas se llamen 'number', 'floor' y 'status'.`;
            
            alert(msg);
            if (floorsData.length === 0) setFloorsData(generateProjectData(projectId));
        } finally {
            setIsLoading(false);
        }
    };

    const handleDownloadPDF = async () => {
        if (!dashboardRef.current) return;
        setIsExporting(true);

        try {
            // Pause to let UI settle
            await new Promise(resolve => setTimeout(resolve, 600));

            const element = document.getElementById('pdf-content-wrapper') || dashboardRef.current;

            // Capture engine refined for tight-wrapping content
            const canvas = await html2canvas(element, {
                scale: 2,
                useCORS: true,
                logging: false,
                backgroundColor: '#ffffff',
                scrollX: 0,
                scrollY: 0,
                // Do not force a massive windowWidth, let it be the content's actual width
                windowWidth: element?.scrollWidth || 1200,
                windowHeight: element?.scrollHeight || 800,
                removeContainer: true,
            });

            const imgData = canvas.toDataURL('image/jpeg', 0.95);

            const isPortraitProject = selectedProject?.id === 'san-ignacio' || selectedProject?.id === 'carvajal-330';
            const orientation = isPortraitProject ? 'portrait' : 'landscape';

            const pdf = new jsPDF({
                orientation: orientation,
                unit: 'mm',
                format: 'a3'
            });

            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = pdf.internal.pageSize.getHeight();
            const margin = 2; // Minimal margins

            const pdfImgProps = pdf.getImageProperties(imgData);
            // Calculate ratio to fit A3 while maintaining aspect ratio
            const ratio = Math.min((pdfWidth - (margin * 2)) / pdfImgProps.width, (pdfHeight - (margin * 2)) / pdfImgProps.height);

            const width = pdfImgProps.width * ratio;
            const height = pdfImgProps.height * ratio;

            // Page Background White
            pdf.setFillColor(255, 255, 255);
            pdf.rect(0, 0, pdfWidth, pdfHeight, 'F');

            // Precise Centering Math
            const xOffset = (pdfWidth - width) / 2;
            const yOffset = (pdfHeight - height) / 2;
            pdf.addImage(imgData, 'JPEG', xOffset, yOffset, width, height);

            const orientationLabel = orientation === 'portrait' ? 'Vertical' : 'Horizontal';
            pdf.save(`Reporte_BuildFlow_A3_${orientationLabel}_${selectedProject?.name.replace(/\s+/g, '_')}_${new Date().toLocaleDateString()}.pdf`);
        } catch (error) {
            console.error('Error en exportación PDF:', error);
        } finally {
            setIsExporting(false);
        }
    };

    // Derived data
    const filteredFloors = useMemo(() => floorsData.map(f => ({
        ...f,
        units: f.units.filter(u => {
            const matchesSearch = u.number.toLowerCase().includes(searchTerm.toLowerCase()) || (u.responsible && u.responsible.toLowerCase().includes(searchTerm.toLowerCase()));
            const matchesStatus = filterStatus === 'ALL' || u.status === filterStatus;
            return matchesStatus && matchesSearch;
        })
    })).filter(f => f.units.length > 0 || searchTerm === ''), [floorsData, filterStatus, searchTerm]);

    const maxUnits = useMemo(() => {
        if (floorsData.length === 0) return 0;
        return Math.max(...floorsData.map(f => f.units.length));
    }, [floorsData]);

    const maxLineNumber = useMemo(() => {
        let max = 0;
        floorsData.forEach(f => {
            f.units.forEach(u => {
                const lineNum = parseInt(String(u.number).slice(-2)); // Ensure u.number is string
                if (!isNaN(lineNum) && lineNum > max) max = lineNum;
            });
        });
        return max || 0;
    }, [floorsData]);

    const lineSums = useMemo(() => {
        const sums = new Array(maxLineNumber).fill(0);
        floorsData.forEach(f => {
            f.units.forEach(u => {
                const lineNum = parseInt(String(u.number).slice(-2)); // Ensure u.number is string
                if (!isNaN(lineNum) && lineNum > 0 && lineNum <= maxLineNumber) {
                    sums[lineNum - 1]++;
                }
            });
        });
        return sums;
    }, [floorsData, maxLineNumber]);

    // Handlers
    const handleSelectProject = (project: Project) => {
        setSelectedProject(project);
        fetchProjectData(project.id);
        setActiveTab('GRID');
        setSearchTerm('');
        setFilterStatus('ALL');
        setView('DASHBOARD');
        localStorage.setItem('selectedProjectId', project.id);
        localStorage.setItem('lastView', 'DASHBOARD');
    };

    const handleSync = () => {
        if (selectedProject) {
            fetchProjectData(selectedProject.id);
        }
    };

    const handleUpdateStatus = (unitId: string, newStatus: UnitStatus) => {
        setFloorsData(prev => prev.map(f => ({
            ...f,
            units: f.units.map(u => u.id === unitId ? { ...u, status: newStatus } : u)
        })));

        if (selectedUnit && selectedUnit.id === unitId) {
            setSelectedUnit({ ...selectedUnit, status: newStatus });
        }
    };

    const handleToggleObservation = (unitId: string, obsIndex: number) => {
        console.log(`Toggled observation ${obsIndex} for unit ${unitId}`);
    };

    const statCounts = useMemo(() => {
        const counts = { E: 0, LE: 0, OBS: 0, SV: 0, DL: 0, R0: 0, R1: 0, R2: 0, R3: 0, REC: 0 };
        const isConstruction = selectedProject?.stage === 'CONSTRUCCION' || selectedProject?.id === 'don-diego';
        let totalCountedUnits = 0;
        
        floorsData.forEach(f => {
            f.units.forEach(u => {
                totalCountedUnits++;
                const s = String(u.status || '').trim().toUpperCase();
                
                if (isConstruction) {
                    if (s === 'R1' || s === 'REVISION 1' || s === 'PRIMERA REVISIÓN') counts.R1++;
                    else if (s === 'R2' || s === 'REVISION 2' || s === 'SEGUNDA REVISIÓN') counts.R2++;
                    else if (s === 'R3' || s === 'REVISION 3' || s === 'TERCERA REVISIÓN') counts.R3++;
                    else if (s === 'REC' || s === 'RECEPCIONADO' || s === 'RECEPCIONADOS') counts.REC++;
                    else counts.R0++;
                } else {
                    if (s === 'MI' || s === 'ENTREGADO' || s === 'E') counts.E++;
                    else if (s === 'OBSERVACIÓN' || s === 'OBSERVACION' || s === 'CON OBSERVACIONES' || s === 'OBS' || (u.observaciones && u.observaciones.length > 0)) counts.OBS++;
                    else if (s === 'LISTO PARA ENTREGA' || s === 'LE') counts.LE++;
                    else if (s === 'SIN VISITA' || s === 'SV') counts.SV++;
                    else if (s === 'DEPARTAMENTO LIBRE' || s === 'DL') counts.DL++;
                    else counts.SV++; // Default fallback for delivery
                }
            });
        });

        // For construction, use the actual count of units as the total capacity
        const totalCapacity = isConstruction ? (totalCountedUnits || selectedProject?.units || 150) : (selectedProject?.units || 150);
        const soldTotal = Math.max(totalCapacity - counts.DL, 1);
        const calcP = (c: number, t: number) => Number(((c / (t || 1 || 1)) * 100).toFixed(1));

        return {
            // Delivery Stats
            visited: { count: counts.E + counts.LE + counts.OBS, percentage: calcP(counts.E + counts.LE + counts.OBS, soldTotal) },
            entregados: { count: counts.E, percentage: calcP(counts.E, soldTotal) },
            listos: { count: counts.LE, percentage: calcP(counts.LE, soldTotal) },
            observaciones: { count: counts.OBS, percentage: calcP(counts.OBS, soldTotal) },
            sinVisita: { count: counts.SV, percentage: calcP(counts.SV, soldTotal) },
            vendidos: { count: soldTotal, percentage: calcP(soldTotal, totalCapacity) },
            // Construction Stats
            r0: { count: counts.R0, percentage: calcP(counts.R0, totalCapacity) },
            r1: { count: counts.R1, percentage: calcP(counts.R1, totalCapacity) },
            r2: { count: counts.R2, percentage: calcP(counts.R2, totalCapacity) },
            r3: { count: counts.R3, percentage: calcP(counts.R3, totalCapacity) },
            recepcionado: { count: counts.REC, percentage: calcP(counts.REC, totalCapacity) },
            total: { count: totalCapacity, percentage: 100 }
        };
    }, [floorsData, selectedProject]);

    const stats = isConstruction ? [
        { label: 'TOTAL DEPARTAMENTOS', value: statCounts.total.count.toString(), percentage: '100%', icon: Layers, color: 'text-gray-900', bg: 'bg-white hover:bg-white dark:bg-zinc-900/50 dark:hover:bg-zinc-900', border: 'border-2 border-gray-100', textLight: false },
        { label: 'R0 - SIN INICIAR', value: statCounts.r0.count.toString(), percentage: `${statCounts.r0.percentage}%`, icon: Construction, color: 'text-gray-500', bg: 'bg-white dark:bg-zinc-900 border-2 border-gray-100 dark:border-zinc-800', textLight: false },
        { label: 'R1 - PRIMERA REVISIÓN', value: statCounts.r1.count.toString(), percentage: `${statCounts.r1.percentage}%`, icon: Construction, color: 'text-red-700', bg: 'bg-red-500 hover:bg-red-600', border: 'border-transparent', textLight: true },
        { label: 'R2 - SEGUNDA REVISIÓN', value: statCounts.r2.count.toString(), percentage: `${statCounts.r2.percentage}%`, icon: Construction, color: 'text-orange-700', bg: 'bg-orange-500 hover:bg-orange-600', border: 'border-transparent', textLight: true },
        { label: 'R3 - TERCERA REVISIÓN', value: statCounts.r3.count.toString(), percentage: `${statCounts.r3.percentage}%`, icon: Construction, color: 'text-yellow-700', bg: 'bg-yellow-400 hover:bg-yellow-500', border: 'border-transparent', textLight: false },
        { label: 'RECEPCIONADOS', value: statCounts.recepcionado.count.toString(), percentage: `${statCounts.recepcionado.percentage}%`, icon: CheckCircle2, color: 'text-green-700', bg: 'bg-green-500 hover:bg-green-600', border: 'border-transparent', textLight: true },
    ] : [
        { label: 'TOTAL UNIDADES', value: statCounts.total.count.toString(), percentage: '100%', icon: Layers, color: 'text-gray-900', bg: 'bg-white hover:bg-white dark:bg-zinc-900/50 dark:hover:bg-zinc-900', border: 'border-2 border-gray-200', textLight: false },
        { label: 'DEPARTAMENTOS VENDIDOS', value: statCounts.vendidos.count.toString(), percentage: `${statCounts.vendidos.percentage}%`, icon: Key, color: 'text-indigo-700', bg: 'bg-white hover:bg-white dark:bg-zinc-900/50 dark:hover:bg-zinc-900', border: 'border-2 border-gray-200', textLight: false },
        { label: 'DEPTOS. VISITADOS', value: statCounts.visited.count.toString(), percentage: `${statCounts.visited.percentage}%`, icon: Eye, color: 'text-blue-700', bg: 'bg-white hover:bg-white dark:bg-zinc-900/50 dark:hover:bg-zinc-900', border: 'border-2 border-gray-200', textLight: false },
        { label: 'ENTREGADOS', value: statCounts.entregados.count.toString(), percentage: `${statCounts.entregados.percentage}%`, icon: CheckCircle2, color: 'text-green-700', bg: 'bg-green-500 hover:bg-green-600', border: 'border-transparent', textLight: true },
        { label: 'LISTOS PARA ENTREGA', value: statCounts.listos.count.toString(), percentage: `${statCounts.listos.percentage}%`, icon: Clock, color: 'text-blue-700', bg: 'bg-blue-500 hover:bg-blue-600', border: 'border-transparent', textLight: true },
        { label: 'CON OBSERVACIONES', value: statCounts.observaciones.count.toString(), percentage: `${statCounts.observaciones.percentage}%`, icon: AlertCircle, color: 'text-amber-700', bg: 'bg-amber-500 hover:bg-amber-600', border: 'border-transparent', textLight: true, clickable: true, onClick: () => setActiveTab('OBSERVATIONS') },
        { label: 'SIN VISITA (VENDIDOS)', value: statCounts.sinVisita.count.toString(), percentage: `${statCounts.sinVisita.percentage}%`, icon: UserX, color: 'text-gray-700', bg: 'bg-gray-400 hover:bg-gray-500', border: 'border-transparent', textLight: true },
    ];

    if (view === 'HOME') {
        return (
            <div className="min-h-screen bg-[#F9FAFB] dark:bg-zinc-950 flex flex-col items-center justify-center p-6 font-sans overflow-hidden relative transition-colors duration-500">
                {/* Background Decorative Elements */}
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-500/5 dark:bg-blue-500/10 blur-[120px] rounded-full"></div>
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-500/5 dark:bg-purple-500/10 blur-[120px] rounded-full"></div>

                <div className="max-w-6xl w-full z-10 relative">
                    {/* Floating Theme Toggle */}
                    <div className="absolute top-0 right-0 z-50">
                        <button
                            onClick={() => setIsDarkMode(!isDarkMode)}
                            className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800 rounded-2xl shadow-xl hover:scale-105 active:scale-95 transition-all group"
                        >
                            {isDarkMode ? (
                                <>
                                    <Sun size={18} className="text-amber-500 group-hover:rotate-90 transition-transform" />
                                    <span className="text-xs font-black text-gray-900 dark:text-white uppercase tracking-widest">Modo Claro</span>
                                </>
                            ) : (
                                <>
                                    <Moon size={18} className="text-indigo-600 group-hover:-rotate-12 transition-transform" />
                                    <span className="text-xs font-black text-gray-900 dark:text-white uppercase tracking-widest">Modo Oscuro</span>
                                </>
                            )}
                        </button>
                    </div>

                    <div className="text-center mb-16 space-y-4 animate-in fade-in slide-in-from-top-10 duration-700">
                        <div className="inline-flex items-center gap-3 px-4 py-2 bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800 rounded-2xl shadow-sm mb-4 theme-transition">
                            <Construction className="text-blue-600 w-5 h-5" />
                            <span className="text-xs font-black uppercase tracking-widest text-gray-500 dark:text-gray-400">Sistema de Gestión de Avance</span>
                        </div>
                        <h1 className="text-5xl font-black text-gray-900 dark:text-white tracking-tight mb-4 text-balanced uppercase">
                            BIENVENIDO
                        </h1>
                        <p className="text-xl text-gray-500 dark:text-gray-400 font-medium">
                            Seleccione la etapa del proyecto para comenzar
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
                        {/* Tarjeta 1: Construcción */}
                        <div
                            onClick={() => setView('SELECT_CONSTRUCTION')}
                            className="group relative bg-white dark:bg-zinc-900 rounded-[2.5rem] border border-gray-100 dark:border-zinc-800 shadow-xl shadow-gray-200/50 dark:shadow-none hover:shadow-2xl hover:shadow-blue-500/10 hover:-translate-y-4 transition-all duration-500 cursor-pointer overflow-hidden p-[2px] bg-gradient-to-br from-transparent to-transparent hover:from-blue-500/20 hover:to-cyan-500/20"
                        >
                            <div className="bg-white dark:bg-zinc-900 rounded-[2.4rem] p-12 flex flex-col items-center text-center space-y-6 h-full">
                                <div className="w-24 h-24 bg-blue-50 dark:bg-blue-900/20 rounded-3xl flex items-center justify-center group-hover:scale-110 transition-transform duration-500">
                                    <HardHat size={48} className="text-blue-600" />
                                </div>
                                <h2 className="text-3xl font-black text-gray-900 dark:text-white uppercase tracking-tighter leading-tight">
                                    Proyectos en proceso<br />de construcción
                                </h2>
                                <button className="w-full py-4 bg-gray-50 dark:bg-zinc-800 dark:text-gray-300 group-hover:bg-black group-hover:text-white dark:group-hover:bg-white dark:group-hover:text-black rounded-2xl text-sm font-black flex items-center justify-center gap-3 transition-all duration-300 mt-4">
                                    INGRESAR ETAPA
                                    <ArrowRight size={18} className="group-hover:translate-x-2 transition-transform" />
                                </button>
                            </div>
                        </div>

                        {/* Tarjeta 2: Entregas */}
                        <div
                            onClick={() => setView('SELECT')}
                            className="group relative bg-white dark:bg-zinc-900 rounded-[2.5rem] border border-gray-100 dark:border-zinc-800 shadow-xl shadow-gray-200/50 dark:shadow-none hover:shadow-2xl hover:shadow-indigo-500/10 hover:-translate-y-4 transition-all duration-500 cursor-pointer overflow-hidden p-[2px] bg-gradient-to-br from-transparent to-transparent hover:from-indigo-500/20 hover:to-purple-500/20"
                        >
                            <div className="bg-white dark:bg-zinc-900 rounded-[2.4rem] p-12 flex flex-col items-center text-center space-y-6 h-full">
                                <div className="w-24 h-24 bg-indigo-50 dark:bg-indigo-900/20 rounded-3xl flex items-center justify-center group-hover:scale-110 transition-transform duration-500">
                                    <Key size={48} className="text-indigo-600" />
                                </div>
                                <h2 className="text-3xl font-black text-gray-900 dark:text-white uppercase tracking-tighter leading-tight">
                                    Proyectos en proceso<br />de entregas
                                </h2>
                                <button className="w-full py-4 bg-gray-50 dark:bg-zinc-800 dark:text-gray-300 group-hover:bg-black group-hover:text-white dark:group-hover:bg-white dark:group-hover:text-black rounded-2xl text-sm font-black flex items-center justify-center gap-3 transition-all duration-300 mt-4">
                                    INGRESAR ETAPA
                                    <ArrowRight size={18} className="group-hover:translate-x-2 transition-transform" />
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    if (view === 'SELECT' || view === 'SELECT_CONSTRUCTION') {
        const stageFilter = view === 'SELECT' ? 'ENTREGA' : 'CONSTRUCCION';
        const title = view === 'SELECT' ? 'PROYECTOS EN ENTREGAS' : 'PROYECTOS EN CONSTRUCCIÓN';
        const filteredProjects = PROJECTS.filter(p => p.stage === stageFilter);

        return (
            <div className="min-h-screen bg-[#F9FAFB] dark:bg-zinc-950 flex flex-col items-center justify-center p-6 font-sans overflow-hidden relative transition-colors duration-500">
                {/* Background Decorative Elements */}
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-500/5 dark:bg-blue-500/10 blur-[120px] rounded-full"></div>
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-500/5 dark:bg-purple-500/10 blur-[120px] rounded-full"></div>

                <div className="max-w-6xl w-full z-10 relative">
                    {/* Floating Theme Toggle for SELECT view */}
                    <div className="absolute top-0 right-0 z-50">
                        <button
                            onClick={() => setIsDarkMode(!isDarkMode)}
                            className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800 rounded-2xl shadow-xl hover:scale-105 active:scale-95 transition-all group"
                        >
                            {isDarkMode ? (
                                <>
                                    <Sun size={18} className="text-amber-500 group-hover:rotate-90 transition-transform" />
                                    <span className="text-xs font-black text-gray-900 dark:text-white uppercase tracking-widest">Modo Claro</span>
                                </>
                            ) : (
                                <>
                                    <Moon size={18} className="text-indigo-600 group-hover:-rotate-12 transition-transform" />
                                    <span className="text-xs font-black text-gray-900 dark:text-white uppercase tracking-widest">Modo Oscuro</span>
                                </>
                            )}
                        </button>
                    </div>

                    {/* Back to HOME toggle */}
                    <div className="absolute top-0 left-0 z-50">
                        <button
                            onClick={() => setView('HOME')}
                            className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800 rounded-2xl shadow-xl hover:scale-105 active:scale-95 transition-all group"
                        >
                            <ArrowRight size={18} className="rotate-180 text-gray-400 group-hover:-translate-x-1 transition-transform" />
                            <span className="text-xs font-black text-gray-900 dark:text-white uppercase tracking-widest">Volver</span>
                        </button>
                    </div>

                    <div className="text-center mb-16 space-y-4 animate-in fade-in slide-in-from-top-10 duration-700">
                        <div className="inline-flex items-center gap-3 px-4 py-2 bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800 rounded-2xl shadow-sm mb-4 theme-transition">
                            <Construction className="text-blue-600 w-5 h-5" />
                            <span className="text-xs font-black uppercase tracking-widest text-gray-500 dark:text-gray-400">Sistema de Gestión de Avance</span>
                        </div>
                        <h1 className="text-5xl font-black text-gray-900 dark:text-white tracking-tight mb-4 text-balanced uppercase">
                            {title}
                        </h1>
                        <p className="text-xl text-gray-500 dark:text-gray-400 font-medium">
                            Seleccione el proyecto para comenzar
                        </p>
                    </div>

                    <div className={`grid grid-cols-1 ${filteredProjects.length > 2 ? 'md:grid-cols-3' : 'md:grid-cols-2'} gap-8 max-w-5xl mx-auto`}>
                        {filteredProjects.map((project, idx) => (
                            <div
                                key={project.id}
                                onClick={() => handleSelectProject(project)}
                                style={{ animationDelay: `${idx * 150}ms` }}
                                className="group relative bg-white dark:bg-zinc-900 rounded-[2.5rem] border border-gray-100 dark:border-zinc-800 shadow-xl shadow-gray-200/50 dark:shadow-none hover:shadow-2xl hover:shadow-blue-500/10 hover:-translate-y-4 transition-all duration-500 cursor-pointer overflow-hidden animate-in fade-in slide-in-from-bottom-10"
                            >
                                <div className="pt-8 px-8 flex justify-center">
                                    <h2 className="text-2xl font-black text-gray-900 dark:text-white uppercase tracking-tighter text-center">
                                        {project.name}
                                    </h2>
                                </div>

                                {/* Project Image Header */}
                                <div className="h-48 overflow-hidden relative bg-gray-50/50 flex items-center justify-center">
                                    <img
                                        src={project.image}
                                        alt={project.name}
                                        className="max-w-full max-h-full object-contain p-6 group-hover:scale-110 transition-transform duration-700 grayscale-[0.2] group-hover:grayscale-0"
                                    />
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
                                    <div className="absolute bottom-6 left-6 right-6">
                                        <div className="flex items-center gap-2 text-white/90">
                                            <MapPin size={14} className="text-blue-400" />
                                            <span className="text-xs font-bold uppercase tracking-widest">{project.location}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Content */}
                                <div className="p-8 space-y-6">

                                    <button className="w-full py-4 bg-gray-50 dark:bg-zinc-800 dark:text-gray-300 group-hover:bg-black group-hover:text-white dark:group-hover:bg-white dark:group-hover:text-black rounded-2xl text-sm font-black flex items-center justify-center gap-3 transition-all duration-300">
                                        INGRESAR AL PANEL
                                        <ArrowRight size={18} className="group-hover:translate-x-2 transition-transform" />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>

                </div>
            </div>
        );
    }

    return (
        <div className="flex h-screen bg-[#F9FAFB] dark:bg-zinc-950 overflow-hidden font-sans transition-colors duration-500">
            {/* Sidebar (Desktop only) */}
            <aside className="hidden lg:flex w-20 hover:w-64 border-r border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 flex-col shadow-sm transition-all duration-300 group overflow-hidden z-50">
                <div className="p-4 group-hover:p-6 transition-all duration-300">
                    <div className="flex items-center justify-center group-hover:justify-start gap-0 group-hover:gap-3 mb-8 cursor-pointer transition-all duration-300" onClick={() => setView('HOME')}>
                        <div className="w-10 h-10 bg-black dark:bg-white rounded-xl flex items-center justify-center shadow-lg shadow-black/10 shrink-0">
                            <Construction className="text-white dark:text-black w-6 h-6" />
                        </div>
                        <span className="font-bold text-base tracking-tighter opacity-0 group-hover:opacity-100 transition-all duration-300 whitespace-nowrap w-0 group-hover:w-auto overflow-hidden text-clip dark:text-white">Flujo de construcción</span>
                    </div>

                    <div className="space-y-1.5 focus-within:ring-0">
                        <button
                            onClick={() => setActiveSidebar('dashboard')}
                            className={`flex items-center justify-center group-hover:justify-start gap-0 group-hover:gap-4 w-full px-3 py-2.5 text-sm font-semibold rounded-xl transition-all ${activeSidebar === 'dashboard' ? 'text-white bg-black dark:bg-white dark:text-black shadow-md' : 'text-gray-500 dark:text-zinc-400 hover:bg-gray-50 dark:hover:bg-zinc-800 hover:text-gray-900 dark:hover:text-white'}`}
                        >
                            <LayoutDashboard size={22} className="shrink-0" />
                            <span className="opacity-0 group-hover:opacity-100 transition-all duration-300 whitespace-nowrap w-0 group-hover:w-auto overflow-hidden">Gestión de Avance</span>
                        </button>
                        <div className="pt-2 mt-4 border-t border-gray-100 dark:border-zinc-800 space-y-1">
                            <button
                                onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    console.log('🖱️ Sidebar Theme Toggle Clicked');
                                    setIsDarkMode(!isDarkMode);
                                }}
                                className={`flex items-center justify-center group-hover:justify-start gap-0 group-hover:gap-4 w-full px-3 py-2.5 text-sm font-semibold rounded-xl transition-all hover:bg-gray-50 dark:hover:bg-zinc-800 group/theme ${isDarkMode ? 'text-amber-500' : 'text-indigo-600'}`}
                            >
                                {isDarkMode ? (
                                    <>
                                        <Sun size={22} className="shrink-0 group-hover/theme:rotate-90 transition-transform" />
                                        <span className="opacity-0 group-hover:opacity-100 transition-all duration-300 whitespace-nowrap w-0 group-hover:w-auto overflow-hidden text-gray-900 dark:text-white">Modo Claro</span>
                                    </>
                                ) : (
                                    <>
                                        <Moon size={22} className="shrink-0 group-hover/theme:-rotate-12 transition-transform" />
                                        <span className="opacity-0 group-hover:opacity-100 transition-all duration-300 whitespace-nowrap w-0 group-hover:w-auto overflow-hidden text-gray-900 dark:text-white">Modo Oscuro</span>
                                    </>
                                )}
                            </button>
                            <button
                                onClick={() => setActiveSidebar('settings')}
                                className={`flex items-center justify-center group-hover:justify-start gap-0 group-hover:gap-4 w-full px-3 py-2.5 text-sm font-semibold rounded-xl transition-all ${activeSidebar === 'settings' ? 'text-white bg-black dark:bg-white dark:text-black shadow-md' : 'text-gray-500 dark:text-zinc-400 hover:bg-gray-50 dark:hover:bg-zinc-800 hover:text-gray-900 dark:hover:text-white'}`}
                            >
                                <Settings size={22} className="shrink-0" />
                                <span className="opacity-0 group-hover:opacity-100 transition-all duration-300 whitespace-nowrap w-0 group-hover:w-auto overflow-hidden">Configuración</span>
                            </button>
                        </div>
                    </div>
                </div>

                <div className="mt-auto p-4 border-t border-gray-100 dark:border-zinc-800">
                    <button
                        onClick={() => setView('HOME')}
                        className="w-full flex items-center justify-center group-hover:justify-start gap-0 group-hover:gap-4 py-3 px-3 text-xs font-black text-gray-400 hover:text-black dark:hover:text-white uppercase tracking-widest transition-all mb-4"
                    >
                        <ArrowRight size={22} className="rotate-180 shrink-0" />
                        <span className="opacity-0 group-hover:opacity-100 transition-all duration-300 whitespace-nowrap w-0 group-hover:w-auto overflow-hidden">Cambiar Proyecto</span>
                    </button>
                    <div className="flex items-center justify-center group-hover:justify-start gap-0 group-hover:gap-3 px-2 py-2.5 bg-gray-50 dark:bg-zinc-800 rounded-2xl border border-gray-100 dark:border-zinc-700 relative overflow-hidden transition-all duration-300">
                        <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center text-white font-bold text-xs shadow-md shadow-blue-200 shrink-0">A</div>
                        <div className="flex-1 overflow-hidden opacity-0 group-hover:opacity-100 transition-all duration-300 w-0 group-hover:w-auto">
                            <p className="text-xs font-bold text-gray-900 dark:text-white truncate">Administrador</p>
                        </div>
                    </div>
                </div>
            </aside>

            {/* Bottom Navigation (Mobile only) */}
            <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-[100] bg-white dark:bg-zinc-900 border-t border-gray-200 dark:border-zinc-800 px-6 py-3 flex items-center justify-between pb-safe">
                <button
                    onClick={() => setActiveSidebar('dashboard')}
                    className={`flex flex-col items-center gap-1 transition-all ${activeSidebar === 'dashboard' ? 'text-black dark:text-white scale-110' : 'text-gray-400'}`}
                >
                    <LayoutDashboard size={20} />
                    <span className="text-[10px] font-black uppercase">Avance</span>
                </button>
                <button
                    onClick={() => {
                        setIsDarkMode(!isDarkMode);
                    }}
                    className={`flex flex-col items-center gap-1 ${isDarkMode ? 'text-amber-500' : 'text-indigo-600'}`}
                >
                    {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
                    <span className="text-[10px] font-black uppercase">{isDarkMode ? 'Claro' : 'Oscuro'}</span>
                </button>
                <div className="w-12 h-12 bg-black dark:bg-white rounded-2xl flex items-center justify-center shadow-lg -translate-y-6 border-4 border-[#F9FAFB] dark:border-zinc-950 transition-all active:scale-95" onClick={() => setView('HOME')}>
                    <Construction className="text-white dark:text-black w-6 h-6" />
                </div>
                <button
                    onClick={() => handleSync()}
                    className={`flex flex-col items-center gap-1 text-gray-400 ${isLoading ? 'animate-spin' : ''}`}
                >
                    <RefreshCw size={20} />
                    <span className="text-[10px] font-black uppercase">Sinc.</span>
                </button>
                <button
                    onClick={() => setActiveSidebar('settings')}
                    className={`flex flex-col items-center gap-1 transition-all ${activeSidebar === 'settings' ? 'text-black dark:text-white scale-110' : 'text-gray-400'}`}
                >
                    <Settings size={20} />
                    <span className="text-[10px] font-black uppercase">Conf.</span>
                </button>
            </nav>

            {/* Main Content */}
            <main className="flex-1 flex flex-col overflow-hidden animate-in fade-in duration-500">
                {/* Topbar */}
                <header className="h-16 lg:h-20 border-b border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-4 lg:px-8 flex items-center justify-between transition-colors duration-500 shrink-0">
                    <div className="flex items-center gap-2 lg:gap-6">
                        <div
                            onClick={() => setView('HOME')}
                            className="flex items-center gap-2 lg:gap-3 px-3 lg:px-4 py-2 border border-gray-200 dark:border-zinc-700 rounded-xl bg-white dark:bg-zinc-800 shadow-sm cursor-pointer hover:border-gray-900 dark:hover:border-white transition-all group"
                        >
                            <span className="text-xs lg:text-sm font-bold text-gray-700 dark:text-gray-300 truncate max-w-[120px] lg:max-w-none">{selectedProject?.name}</span>
                            <ChevronDown size={14} className="text-gray-400 group-hover:text-gray-900 dark:group-hover:text-white shrink-0" />
                        </div>
                    </div>

                    <div className="flex items-center gap-2 lg:gap-6">
                        <button
                            onClick={handleSync}
                            disabled={isLoading}
                            className={`hidden lg:flex items-center gap-2 px-4 py-2 border border-gray-200 dark:border-zinc-700 rounded-xl bg-white dark:bg-zinc-800 shadow-sm hover:border-black dark:hover:border-white transition-all group ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                            <RefreshCw size={16} className={`text-gray-400 group-hover:text-black dark:group-hover:text-white ${isLoading ? 'animate-spin' : ''}`} />
                            <span className="text-sm font-bold text-gray-700 dark:text-gray-300">Sincronizar</span>
                        </button>
                        <div className="relative group lg:block hidden">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-black dark:group-focus-within:text-white transition-colors" size={18} />
                            <input
                                type="text"
                                placeholder="Buscar unidad..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-11 pr-4 py-2.5 bg-gray-100 dark:bg-zinc-800 border-2 border-transparent rounded-2xl text-sm w-48 lg:w-72 focus:bg-white dark:focus:bg-zinc-900 focus:border-black/5 dark:focus:border-white/5 focus:ring-4 focus:ring-black/5 dark:focus:ring-white/5 transition-all font-semibold outline-none dark:text-white"
                            />
                        </div>
                        <div className="flex items-center gap-1 lg:gap-2">
                            <button
                                onClick={() => setIsDarkMode(!isDarkMode)}
                                className="lg:p-2.5 p-2 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-xl cursor-pointer transition-all active:scale-95 group/toptheme"
                            >
                                {isDarkMode ? <Sun size={20} className="text-amber-500 lg:size-5.5" /> : <Moon size={20} className="text-indigo-600 lg:size-5.5" />}
                            </button>
                        </div>
                    </div>
                </header>

                {/* Main View Area */}
                <div className="flex-1 flex flex-col overflow-hidden relative">
                    {activeSidebar === 'settings' ? (
                        <div className="h-full overflow-y-auto p-4 lg:p-10 bg-[#fbfcfd] dark:bg-zinc-950 transition-colors duration-500 pb-32">
                            <div className="max-w-4xl mx-auto space-y-10">
                                <div>
                                    <h1 className="text-2xl lg:text-4xl font-black text-gray-900 dark:text-white tracking-tight">Configuración</h1>
                                    <p className="text-gray-500 dark:text-zinc-400 mt-2 font-semibold text-lg">Personaliza tu experiencia en BuildFlow.</p>
                                </div>

                                <div className="grid grid-cols-1 gap-6">
                                    {/* Appearance Section */}
                                    <div className="bg-white dark:bg-zinc-900 rounded-3xl lg:rounded-[2.5rem] p-6 lg:p-8 border border-gray-100 dark:border-zinc-800 shadow-sm transition-all">
                                        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                                            <div className="space-y-1">
                                                <h3 className="text-xl font-black text-gray-900 dark:text-white">Apariencia</h3>
                                                <p className="text-sm text-gray-500 dark:text-zinc-400 font-medium">Cambia entre el modo claro y oscuro.</p>
                                            </div>
                                            <div className="flex bg-gray-100 dark:bg-zinc-800 p-1.5 rounded-2xl border border-transparent shadow-inner relative z-50 w-fit">
                                                <button
                                                    onClick={() => setIsDarkMode(false)}
                                                    className={`flex items-center gap-2 px-6 py-2.5 text-xs font-black rounded-xl transition-all z-10 ${!isDarkMode ? 'bg-white text-black shadow-lg relative' : 'text-gray-400'}`}
                                                >
                                                    <Sun size={16} />
                                                    MODO CLARO
                                                </button>
                                                <button
                                                    onClick={() => setIsDarkMode(true)}
                                                    className={`flex items-center gap-2 px-6 py-2.5 text-xs font-black rounded-xl transition-all z-10 ${isDarkMode ? 'bg-zinc-900 text-white shadow-lg dark:bg-zinc-700 relative' : 'text-gray-400'}`}
                                                >
                                                    <Moon size={16} />
                                                    MODO OSCURO
                                                </button>
                                            </div>
                                        </div>
                                    </div>

                                    {/* App Info Section */}
                                    <div className="bg-white dark:bg-zinc-900 rounded-3xl lg:rounded-[2.5rem] p-6 lg:p-8 border border-gray-100 dark:border-zinc-800 shadow-sm transition-all">
                                        <div className="space-y-4">
                                            <h3 className="text-xl font-black text-gray-900 dark:text-white">Información</h3>
                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="p-4 bg-gray-50 dark:bg-zinc-800/50 rounded-2xl border border-gray-100 dark:border-zinc-800">
                                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Versión</p>
                                                    <p className="text-sm font-bold text-gray-900 dark:text-white mt-1">v2.4.0</p>
                                                </div>
                                                <div className="p-4 bg-gray-50 dark:bg-zinc-800/50 rounded-2xl border border-gray-100 dark:border-zinc-800">
                                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Rol</p>
                                                    <p className="text-sm font-bold text-gray-900 dark:text-white mt-1">Administrador</p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div ref={dashboardRef} className={`flex-1 overflow-y-auto bg-[#FBFCFD] dark:bg-zinc-950 px-4 lg:px-8 py-6 lg:py-8 ${isExporting ? 'exporting-content !p-0' : 'pb-32'}`}>
                            <div id="pdf-content-wrapper" className={isExporting ? 'inline-block min-w-fit space-y-12' : 'max-w-7xl mx-auto space-y-6 lg:space-y-10 pb-12'}>
                                {/* Page Header */}
                                <div className={`flex flex-col lg:flex-row lg:items-end justify-between gap-6 ${isExporting ? 'mb-8' : ''}`}>
                                    <div className="space-y-1 lg:space-y-2">
                                        <h1 className="text-2xl lg:text-4xl font-black text-gray-900 dark:text-white uppercase tracking-tightest">
                                            {selectedProject?.name}
                                        </h1>
                                    </div>
                                    <div className="flex gap-3 lg:gap-4 overflow-x-auto lg:overflow-visible pb-2 lg:pb-0 scrollbar-hide">
                                        <div className="relative group">
                                            <button className="flex items-center gap-2 px-5 py-3 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-2xl text-sm font-bold hover:border-gray-900 dark:hover:border-white shadow-sm transition-all active:scale-95 dark:text-gray-300">
                                                <Filter size={18} />
                                                <span className="whitespace-nowrap">{filterStatus === 'ALL' ? 'Todos los Estados' : STATUS_CONFIG[filterStatus].label}</span>
                                            </button>
                                            <div className="hidden lg:group-hover:block absolute top-[calc(100%-10px)] right-0 pt-[10px] z-50 min-w-[240px]">
                                                <div className="bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800 rounded-2xl shadow-2xl p-2.5">
                                                    <button onClick={() => setFilterStatus('ALL')} className="w-full text-left px-4 py-2.5 text-sm hover:bg-gray-50 dark:hover:bg-zinc-800 rounded-xl font-bold text-gray-600">Ver Todo</button>
                                                    {((isConstruction) ? ['R0', 'R1', 'R2', 'R3', 'REC'] : ['E', 'LE', 'OBS', 'SV', 'DL']).map((code) => {
                                                        const config = (isConstruction ? CONSTRUCTION_STATUS_CONFIG : STATUS_CONFIG)[code];
                                                        return (
                                                            <button key={code} onClick={() => setFilterStatus(code as UnitStatus)} className="w-full text-left px-4 py-2.5 text-sm hover:bg-gray-50 dark:hover:bg-zinc-800 rounded-xl flex items-center gap-3">
                                                                <div className={`w-3 h-3 rounded-full ${config.bg}`}></div>
                                                                <span className="font-bold text-gray-600">{config.label}</span>
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        </div>
                                        <button
                                            onClick={handleDownloadPDF}
                                            data-html2canvas-ignore
                                            className="flex items-center gap-2 px-4 lg:px-6 py-2.5 lg:py-3 bg-black dark:bg-white text-white dark:text-black rounded-xl lg:rounded-2xl text-xs lg:text-sm font-bold shadow-xl whitespace-nowrap active:scale-95 transition-all"
                                        >
                                            <Download size={16} />
                                            PDF
                                        </button>
                                    </div>
                                </div>

                                {/* KPI Cards */}
                                <div className="grid grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-3 lg:gap-4">
                                    {stats.map((stat, index) => {
                                        const isMainCard = index < 3;
                                        const isClickable = (stat as any).clickable;
                                        return (
                                            <div
                                                key={stat.label}
                                                onClick={() => isClickable && (stat as any).onClick()}
                                                className={`${stat.bg} border ${stat.border} ${isMainCard ? 'p-6 lg:p-7' : 'p-4 lg:p-5'} rounded-2xl lg:rounded-3xl dark:border-zinc-800 shadow-sm transition-all duration-500 group relative overflow-hidden flex flex-col justify-between h-full ${isClickable ? 'cursor-pointer hover:scale-[1.02] active:scale-[0.98]' : ''}`}
                                            >
                                                <div className="flex items-center justify-between mb-2 lg:mb-4">
                                                    <div className={`p-2 lg:p-2.5 rounded-lg lg:rounded-xl bg-white/90 dark:bg-zinc-800 ${stat.color} shadow-sm`}>
                                                        <stat.icon size={18} className="lg:size-5.5" />
                                                    </div>
                                                    <div className="flex flex-col items-end">
                                                        <span className={`text-xs lg:text-[14px] font-black ${stat.textLight ? 'text-white' : 'text-gray-900 dark:text-white'} ${isExporting ? 'px-3 py-1 inline-block leading-none' : 'px-2 lg:px-2.5 py-0.5'}`}>{stat.percentage}</span>
                                                        <span className={`text-[7px] lg:text-[8px] font-bold ${stat.textLight ? 'text-white/90' : 'text-gray-400'} mt-1 uppercase tracking-tighter text-right`}>
                                                            {isConstruction ? 'del total' : (stat.label === 'DEPARTAMENTOS VENDIDOS' || stat.label === 'TOTAL UNIDADES' ? 'del total' : 'de las unidades vendidas')}
                                                        </span>
                                                    </div>
                                                </div>
                                                <div>
                                                    <h3 className={`text-[9px] lg:text-[10px] font-black ${stat.textLight ? 'text-white/95' : 'text-gray-500'} uppercase tracking-wider leading-tight min-h-[2em]`}>{stat.label}</h3>
                                                    <div className="flex items-baseline gap-1 mt-1 lg:mt-2">
                                                        <p className={`text-xl lg:text-3xl font-black ${stat.textLight ? 'text-white' : 'text-gray-900 dark:text-white'} tracking-tighter`}>{stat.value}</p>
                                                        <span className={`text-[8px] lg:text-[10px] font-bold ${stat.textLight ? 'text-white/80' : 'text-gray-400'} uppercase tracking-widest shrink-0`}>unidades</span>
                                                    </div>
                                                </div>
                                            </div>
                                        )
                                    })}
                                </div>

                                {/* Matrix Container */}
                                <div id="matrix-container" className="bg-white dark:bg-zinc-900 rounded-3xl lg:rounded-[3rem] border border-gray-200 dark:border-zinc-800 shadow-2xl dark:shadow-none overflow-hidden min-h-[500px] lg:min-h-[700px] flex flex-col transition-all">
                                    <div className="p-4 lg:p-8 border-b border-gray-100 dark:border-zinc-800 bg-gray-50/30 dark:bg-zinc-800/30 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                                        <div>
                                            <h2 className="text-lg lg:text-2xl font-black text-gray-900 dark:text-white tracking-tight leading-none">Matriz de Unidades</h2>
                                            <p className="text-xs lg:text-sm text-gray-500 dark:text-zinc-400 mt-1 lg:mt-2 font-medium">Arquitectura visual del proyecto: {selectedProject?.name}</p>
                                        </div>
                                        <div className="flex col-span-full py-4 border-y border-gray-100 dark:border-zinc-800 overflow-x-auto scrollbar-hide">
                                            <div className="flex gap-4 lg:gap-6 lg:items-center min-w-max">
                                                {(isConstruction ? ['R0', 'R1', 'R2', 'R3', 'REC'] : ['ENTREGADO', 'LISTO PARA ENTREGA', 'CON OBSERVACIONES', 'SIN VISITA', 'DEPARTAMENTO LIBRE']).map((label) => {
                                                    const config = getStatusConfig(label);
                                                    return (
                                                        <div key={label} className="flex items-center gap-1.5 lg:gap-2 whitespace-nowrap">
                                                            <div className={`w-2.5 h-2.5 lg:w-3 lg:h-3 rounded-full ${config?.bg || 'bg-gray-200'}`}></div>
                                                            <span className="text-[9px] lg:text-[10px] font-black text-gray-400 dark:text-zinc-500 uppercase tracking-widest leading-none">
                                                                {config?.label || label}
                                                            </span>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                        <div className="flex bg-gray-100 dark:bg-zinc-800 p-1 rounded-xl lg:rounded-2xl border border-transparent shadow-inner w-fit self-center lg:self-auto">
                                            <button
                                                onClick={() => setActiveTab('GRID')}
                                                className={`px-4 lg:px-6 py-1.5 lg:py-2 text-[10px] lg:text-xs font-black rounded-lg lg:rounded-xl transition-all ${activeTab === 'GRID' ? 'bg-white text-black dark:bg-zinc-700 dark:text-white shadow-lg' : 'text-gray-400'}`}
                                            >
                                                DIAGRAMA
                                            </button>
                                            <button
                                                onClick={() => setActiveTab('TABLE')}
                                                className={`px-4 lg:px-6 py-1.5 lg:py-2 text-[10px] lg:text-xs font-black rounded-lg lg:rounded-xl transition-all ${activeTab === 'TABLE' ? 'bg-white text-black dark:bg-zinc-700 dark:text-white shadow-lg' : 'text-gray-400 hover:text-gray-900 dark:hover:text-white cursor-pointer'}`}
                                            >
                                                DETALLE
                                            </button>
                                        </div>
                                    </div>

                                    <div className="p-4 lg:p-10 flex-1 overflow-x-auto relative">
                                        {activeTab === 'OBSERVATIONS' ? (
                                            <div className="space-y-6 max-w-5xl mx-auto">
                                                <div className="flex items-center justify-between mb-8">
                                                    <h3 className="text-xl lg:text-2xl font-black text-gray-900 dark:text-white uppercase tracking-tighter">Unidades con Observaciones</h3>
                                                    <button
                                                        onClick={() => setActiveTab('GRID')}
                                                        className="px-4 py-2 bg-gray-100 dark:bg-zinc-800 text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black transition-all"
                                                    >
                                                        Volver a la Matriz
                                                    </button>
                                                </div>
                                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6 pb-12">
                                                    {floorsData.flatMap(f => f.units)
                                                        .filter(u => STATUS_CONFIG[u.status.trim().toUpperCase()]?.short === 'OBS')
                                                        .sort((a, b) => {
                                                            const dateA = a.fecha_obs ? new Date(a.fecha_obs).getTime() : 0;
                                                            const dateB = b.fecha_obs ? new Date(b.fecha_obs).getTime() : 0;
                                                            return dateA - dateB; // Oldest first
                                                        })
                                                        .map(u => {
                                                            const diffDays = u.fecha_obs ? (() => {
                                                                try {
                                                                    const obsDate = new Date(u.fecha_obs);
                                                                    if (isNaN(obsDate.getTime())) return null;
                                                                    const today = new Date();
                                                                    return calculateBusinessDays(obsDate, today);
                                                                } catch (e) { return null; }
                                                            })() : null;

                                                            const isOverdue = diffDays !== null && diffDays > 15;

                                                            return (
                                                                <div
                                                                    key={u.id}
                                                                    onClick={() => setSelectedUnit(u)}
                                                                    className="bg-white dark:bg-zinc-900 p-6 rounded-[2.5rem] border border-gray-100 dark:border-zinc-800 shadow-lg hover:shadow-2xl hover:-translate-y-2 transition-all duration-500 cursor-pointer group"
                                                                >
                                                                    <div className="flex justify-between items-start mb-4">
                                                                        <div className="flex flex-col">
                                                                            <span className="text-xl lg:text-2xl font-black text-gray-900 dark:text-white tracking-tighterest">
                                                                                Departamento {String(u.number).replace(/^(U\.|EE\. UU\.|DEPTO\.|UNIDAD)\s*/i, '')}
                                                                            </span>
                                                                            <div className="flex gap-3 mt-1.5">
                                                                                <div className="px-2 py-0.5 bg-gray-100 dark:bg-zinc-800 rounded-md">
                                                                                    <span className="text-[8px] lg:text-[9px] font-black text-gray-500 dark:text-zinc-400 uppercase tracking-widest">Bodega: {u.storageNumber || '-'}</span>
                                                                                </div>
                                                                                <div className="px-2 py-0.5 bg-gray-100 dark:bg-zinc-800 rounded-md">
                                                                                    <span className="text-[8px] lg:text-[9px] font-black text-gray-500 dark:text-zinc-400 uppercase tracking-widest">Estac.: {u.parkingNumber || '-'}</span>
                                                                                </div>
                                                                            </div>
                                                                        </div>
                                                                        <div className={`p-2.5 ${isOverdue ? 'bg-red-500 animate-bounce' : 'bg-amber-500'} rounded-xl text-white transition-colors duration-500 shadow-lg`}>
                                                                            <AlertCircle size={20} />
                                                                        </div>
                                                                    </div>
                                                                    <div className="space-y-4">
                                                                        <div>
                                                                            <p className="text-[10px] font-black text-gray-400 dark:text-zinc-500 uppercase tracking-widest mb-1.5 flex items-center gap-2">
                                                                                <User size={12} />
                                                                                Propietario / Responsable
                                                                            </p>
                                                                            <p className="text-sm font-black text-gray-800 dark:text-gray-200 uppercase tracking-tight line-clamp-1">
                                                                                {u.responsible || 'SIN ASIGNAR'}
                                                                            </p>
                                                                        </div>
                                                                        <div className="pt-2 border-t border-gray-50 dark:border-zinc-800 text-center">
                                                                            <p className={`text-[11px] font-extrabold ${isOverdue ? 'text-red-600 dark:text-red-500' : 'text-amber-600 dark:text-amber-500'} uppercase tracking-widest flex items-center justify-center gap-2 transition-colors`}>
                                                                                <Clock size={14} className={isOverdue ? 'animate-spin-slow' : ''} />
                                                                                {diffDays !== null ? `HAN PASADO ${diffDays} DIAS HABILES DESDE EL ENVIO DE LAS OBSERVACIONES` : 'Fecha no registrada'}
                                                                            </p>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            );
                                                        })}
                                                </div>
                                            </div>
                                        ) : activeTab === 'GRID' ? (
                                            <div className={`flex flex-col ${selectedProject?.id === 'san-ignacio' ? 'gap-1' : 'gap-4'} w-fit mx-auto lg:pb-0 pb-10`}>
                                                {/* Typology Headers Row */}
                                                <div className={`flex ${selectedProject?.id === 'don-claudio' ? 'gap-1 lg:gap-1.5' : 'gap-2 lg:gap-4'}`}>
                                                    <div className={`${selectedProject?.id === 'don-claudio' ? 'w-10 lg:w-12' : 'w-14 lg:w-20'} shrink-0`}></div>
                                                    <div className={`flex ${selectedProject?.id === 'san-ignacio' ? 'gap-6' : 'gap-1.5'} flex-1 flex-nowrap min-w-max`}>
                                                        {Array.from({ length: Math.max(...floorsData.flatMap(f => f.units.map(u => parseInt(String(u.number).slice(-2)))) || [17]) }, (_, i) => {
                                                            const lineNum = i + 1;
                                                            return (
                                                                <div key={i} className={`${isExporting ? 'min-w-[90px]' : 'w-12 lg:w-16'} text-center`}>
                                                                    <span className="text-[8px] lg:text-[10px] font-bold text-gray-400 dark:text-zinc-500 uppercase tracking-widest block">L{lineNum}</span>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                                {floorsData.sort((a, b) => {
                                                    // Handle string floors like 'LISTADO'
                                                    const floorA = typeof a.floor === 'string' ? -1 : a.floor;
                                                    const floorB = typeof b.floor === 'string' ? -1 : b.floor;
                                                    return (floorB as number) - (floorA as number);
                                                }).map((floor) => (
                                                    <div key={floor.floor} className={`flex ${selectedProject?.id === 'don-claudio' ? 'gap-1 lg:gap-1.5' : 'gap-2 lg:gap-4'} group floor-row`}>
                                                        <div className={`${selectedProject?.id === 'don-claudio' ? 'w-10 lg:w-12 text-center' : 'w-14 lg:w-20'} shrink-0 ${selectedProject?.id === 'san-ignacio' ? 'pt-1' : 'pt-2'}`}>
                                                            <span className="text-[10px] lg:text-xs font-black text-gray-900 dark:text-white uppercase tracking-widest">PISO {floor.floor}</span>
                                                        </div>
                                                        <div className={`flex ${selectedProject?.id === 'san-ignacio' ? 'gap-6' : 'gap-1.5'} flex-1 flex-nowrap min-w-max`}>
                                                            {Array.from({ length: Math.max(...floorsData.flatMap(f => f.units.map(u => parseInt(String(u.number).slice(-2)))) || [17]) }, (_, i) => {
                                                                const lineNum = i + 1;
                                                                const unit = floor.units.find(u => parseInt(String(u.number).slice(-2)) === lineNum);
                                                                if (!unit) return <div key={`empty-${lineNum}`} className={`${isExporting ? 'w-[90px] h-[90px]' : 'w-12 h-16 lg:w-16 lg:h-20'} shrink-0`} />;
                                                                const isFiltered = filterStatus !== 'ALL' && unit.status !== filterStatus;
                                                                const matchesSearch = searchTerm === '' || unit.number.toLowerCase().includes(searchTerm.toLowerCase()) || (unit.responsible && unit.responsible.toLowerCase().includes(searchTerm.toLowerCase()));

                                                                if (isFiltered || !matchesSearch) {
                                                                    return <div key={unit.id} className={`${isExporting ? 'w-[90px] h-[90px]' : 'w-12 h-16 lg:w-16 lg:h-20'} rounded-lg lg:rounded-xl border border-dotted border-gray-200 opacity-20 shrink-0`}></div>;
                                                                }

                                                                const sc = getStatusConfig(unit.status);
                                                                const bNumber = String(unit.storageNumber || '-').replace(/B-/g, '').trim();
                                                                const eNumber = String(unit.parkingNumber || '-').replace(/E-/g, '').trim();

                                                                return (
                                                                    <div
                                                                        key={unit.id}
                                                                        onClick={() => {
                                                                            setSearchTerm(unit.number);
                                                                            setActiveTab('TABLE');
                                                                            window.scrollTo({ top: document.querySelector('table')?.offsetTop || 1000, behavior: 'smooth' });
                                                                        }}
                                                                        title={`Depto: ${unit.number}\nPropietario: ${unit.responsible || 'Sin asignar'}`}
                                                                        className={`relative ${isExporting ? 'w-[90px] h-[90px]' : 'w-12 h-16 lg:w-16 lg:h-20 unit-hover-effect'} rounded-lg lg:rounded-xl flex flex-col items-center justify-center border-2 border-transparent shadow-md ${sc.bg} text-white transition-all duration-300 cursor-pointer active:scale-95 shrink-0`}
                                                                    >
                                                                        <span className={`font-black tracking-tighter leading-none mb-1.5 ${isExporting ? 'text-[16px]' : 'text-[10px] lg:text-[14px]'}`}>
                                                                            {unit.number}
                                                                        </span>
                                                                        <div className={`flex flex-col items-center gap-0.5 opacity-100 ${isExporting ? 'scale-100' : 'scale-[0.9] lg:scale-100'}`}>
                                                                            <span className={`font-black leading-tight uppercase w-full text-center break-words ${isExporting ? 'text-[11px] max-w-[85px]' : 'text-[8px] lg:text-[10px] whitespace-nowrap overflow-hidden'}`}>
                                                                                B: {bNumber}
                                                                            </span>
                                                                            <span className={`font-black leading-tight uppercase w-full text-center break-words ${isExporting ? 'text-[11px] max-w-[85px]' : 'text-[8px] lg:text-[10px] whitespace-nowrap overflow-hidden'}`}>
                                                                                E: {eNumber}
                                                                            </span>
                                                                        </div>
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <div className="w-full">
                                                <table className="w-full text-left border-separate border-spacing-y-2 lg:border-spacing-y-4">
                                                    <thead className="hidden lg:table-header-group text-xs text-gray-400 uppercase font-black tracking-widest">
                                                        <tr>
                                                            <th className="px-8 py-2">Unidad</th>
                                                            <th className="px-8 py-2">Ubicación</th>
                                                            <th className="px-8 py-2">Bodega</th>
                                                            <th className="px-8 py-2">Estac.</th>
                                                            <th className="px-8 py-2">Estado</th>
                                                            <th className="px-8 py-2">Propietario</th>
                                                            <th className="px-8 py-2 text-right">Versión</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {floorsData.flatMap(f => f.units)
                                                            .filter(u => (filterStatus === 'ALL' || u.status === filterStatus) && (searchTerm === '' || u.number.toLowerCase().includes(searchTerm.toLowerCase()) || (u.responsible && u.responsible.toLowerCase().includes(searchTerm.toLowerCase()))))
                                                            .map(unit => (
                                                                <tr key={unit.id} onClick={() => setSelectedUnit(unit)} className="bg-white dark:bg-zinc-900 shadow-sm border border-gray-100 rounded-xl cursor-pointer">
                                                                    <td className="px-4 lg:px-8 py-3 lg:py-5 rounded-l-xl lg:rounded-l-2xl">
                                                                        {(() => {
                                                                                    const sc = getStatusConfig(unit.status);
                                                                                    return (
                                                                                        <div className="flex items-center gap-3">
                                                                                            <div className={`w-2 h-2 lg:w-3 lg:h-3 rounded-full ${sc.bg}`}></div>
                                                                                            <span className="font-black text-gray-900 dark:text-white text-sm lg:text-base">{unit.number}</span>
                                                                                        </div>
                                                                            );
                                                                        })()}
                                                                    </td>
                                                                    <td className="hidden lg:table-cell px-8 py-5">
                                                                        <span className="text-sm font-bold text-gray-600">{unit.floor}</span>
                                                                    </td>
                                                                    <td className="hidden lg:table-cell px-8 py-5">
                                                                        <span className="text-sm font-bold text-gray-600 truncate max-w-[100px] block">{unit.storageNumber || '-'}</span>
                                                                    </td>
                                                                    <td className="hidden lg:table-cell px-8 py-5">
                                                                        <span className="text-sm font-bold text-gray-600 truncate max-w-[100px] block">{unit.parkingNumber || '-'}</span>
                                                                    </td>
                                                                    <td className="px-4 lg:px-8 py-3 lg:py-5">
                                                                        {(() => {
                                                                                const sc = getStatusConfig(unit.status);
                                                                                return (
                                                                                    <span className={`px-3 lg:px-4 py-1 rounded-full text-[8px] lg:text-[10px] font-black uppercase ${sc.color === 'text-white' || sc.color === 'text-gray-900' ? 'text-current' : 'text-white'} ${sc.bg}`}>
                                                                                        {sc.label}
                                                                                    </span>
                                                                                );
                                                                        })()}
                                                                    </td>
                                                                    <td className="hidden lg:table-cell px-8 py-5">
                                                                        <span className="text-sm font-bold text-gray-600 truncate max-w-[150px] block">{unit.responsible || '-'}</span>
                                                                    </td>
                                                                    <td className="px-4 lg:px-8 py-3 lg:py-5 text-right rounded-r-xl lg:rounded-r-2xl">
                                                                        <span className="text-xs font-black text-gray-400 ml-auto">
                                                                            {getStatusConfig(unit.status).short}
                                                                        </span>
                                                                    </td>
                                                                </tr>
                                                            ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </main>

            {/* Unit Detail Side Modal */}
            {
                selectedUnit && (
                    <>
                        <div className="fixed inset-0 bg-black/60 dark:bg-black/80 backdrop-blur-md z-[100] transition-all animate-in fade-in duration-300" onClick={() => setSelectedUnit(null)}></div>
                        <div className="fixed inset-y-0 right-0 w-full lg:w-[520px] bg-white dark:bg-zinc-900 shadow-[-20px_0_60px_-15px_rgba(0,0,0,0.1)] dark:shadow-none z-[101] flex flex-col animate-in slide-in-from-right duration-500 ease-out transition-colors duration-500 overflow-hidden">
                            <div className="p-6 lg:p-10 border-b border-gray-100 dark:border-zinc-800 flex items-center justify-between bg-white dark:bg-zinc-900 relative overflow-hidden transition-colors duration-500 shrink-0">
                                <div className="z-10">
                                    <div className="flex items-center gap-4">
                                        <h2 className="text-xl lg:text-3xl font-black text-gray-900 dark:text-white tracking-tighterest">Unidad {selectedUnit.number}</h2>
                                        {(() => {
                                            const sc = getStatusConfig(selectedUnit.status);
                                            return (
                                                <span className={`px-3 lg:px-4 py-1 lg:py-1.5 rounded-full text-[9px] lg:text-[11px] font-black uppercase shadow-lg ${sc.bg} ${sc.color === 'text-white' ? 'text-white' : 'text-gray-900'}`}>
                                                    {sc.label}
                                                </span>
                                            );
                                        })()}
                                    </div>
                                    <p className="text-gray-500 dark:text-zinc-400 text-sm lg:text-base font-semibold mt-2 lg:mt-3 flex items-center gap-2">
                                        <Layers size={14} className="lg:size-4" />
                                        Piso {selectedUnit.floor}
                                        <span className="w-1.5 h-1.5 rounded-full bg-gray-300 dark:bg-zinc-700 mx-1"></span>
                                        <Home size={14} className="lg:size-4" />
                                        {selectedProject?.name}
                                    </p>
                                    {(STATUS_CONFIG[selectedUnit.status.trim().toUpperCase()]?.short === 'OBS' || selectedUnit.link_acta) && (
                                        <div className="flex flex-col items-center justify-center gap-3 mt-6 bg-amber-50/50 dark:bg-amber-900/10 p-6 rounded-[2rem] border border-amber-100/50 dark:border-amber-900/20">
                                            {selectedUnit.fecha_obs && (
                                                <>
                                                    <p className="inline-flex items-center gap-3 px-6 py-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-900/40 rounded-2xl text-sm lg:text-base font-black text-amber-700 dark:text-amber-400 uppercase tracking-tighter shadow-sm">
                                                        <Clock size={20} className="text-amber-500" />
                                                        Obs. registrada el: {(() => {
                                                            try {
                                                                const date = new Date(selectedUnit.fecha_obs!);
                                                                if (isNaN(date.getTime())) return selectedUnit.fecha_obs;
                                                                const day = String(date.getDate()).padStart(2, '0');
                                                                const month = String(date.getMonth() + 1).padStart(2, '0');
                                                                const year = date.getFullYear();
                                                                return `${day}/${month}/${year}`;
                                                            } catch (e) {
                                                                return selectedUnit.fecha_obs;
                                                            }
                                                        })()}
                                                    </p>
                                                    <p className={`text-xs lg:text-sm font-black uppercase tracking-widest animate-pulse ${(() => {
                                                        try {
                                                            const obsDate = new Date(selectedUnit.fecha_obs!);
                                                            if (isNaN(obsDate.getTime())) return 'text-amber-600 dark:text-amber-500';
                                                            const diffDays = calculateBusinessDays(obsDate, new Date());
                                                            return diffDays > 15 ? 'text-red-600 dark:text-red-500' : 'text-amber-600 dark:text-amber-500';
                                                        } catch (e) { return 'text-amber-600 dark:text-amber-500'; }
                                                    })()}`}>
                                                        {(() => {
                                                            try {
                                                                const obsDate = new Date(selectedUnit.fecha_obs!);
                                                                if (isNaN(obsDate.getTime())) return '';
                                                                const today = new Date();
                                                                const diffDays = calculateBusinessDays(obsDate, today);
                                                                return `HAN PASADO ${diffDays} DIAS HABILES DESDE EL ENVIO DE LAS OBSERVACIONES`;
                                                            } catch (e) {
                                                                return '';
                                                            }
                                                        })()}
                                                    </p>
                                                </>
                                            )}
                                            {selectedUnit.link_acta && (
                                                <button
                                                    onClick={() => setViewerPdfUrl(selectedUnit.link_acta!)}
                                                    className="inline-flex items-center gap-2 px-6 py-3 bg-white dark:bg-zinc-800 border-2 border-red-500 text-red-600 dark:text-red-400 rounded-2xl text-[10px] lg:text-xs font-black uppercase tracking-widest transition-all shadow-md hover:bg-red-500 hover:text-white dark:hover:bg-red-600 active:scale-95 group"
                                                >
                                                    <FileText size={16} className="group-hover:rotate-6 transition-transform" />
                                                    Ver Acta de Observaciones
                                                </button>
                                            )}
                                        </div>
                                    )}
                                </div>
                                <button
                                    onClick={() => setSelectedUnit(null)}
                                    className="w-10 h-10 lg:w-12 lg:h-12 flex items-center justify-center rounded-xl lg:rounded-2xl bg-gray-50 dark:bg-zinc-800 text-gray-400 dark:text-zinc-500 hover:bg-black dark:hover:bg-white hover:text-white dark:hover:text-black transition-all duration-300 active:scale-90"
                                >
                                    <Plus size={20} className="rotate-45 lg:size-6" />
                                </button>
                            </div>

                            <div className="flex-1 overflow-y-auto p-6 lg:p-10 space-y-8 lg:space-y-12">
                                {/* Unit Metadata Section */}
                                <div className="space-y-4 lg:space-y-6">
                                    <h3 className="text-[10px] lg:text-xs font-black text-gray-400 dark:text-zinc-500 uppercase tracking-widest flex items-center gap-2">
                                        <User size={14} />
                                        Propietario / Responsable
                                    </h3>
                                    <div className="bg-[#f8f9fa] dark:bg-zinc-800/50 p-6 lg:p-8 rounded-[2rem] lg:rounded-[2.5rem] border border-gray-100 dark:border-zinc-800 relative overflow-hidden transition-all">
                                        <p className="text-[9px] lg:text-[10px] text-gray-400 dark:text-zinc-500 font-black uppercase tracking-widest relative z-10 flex items-center gap-2">
                                            Nombre del Propietario
                                            <span className="w-1 h-1 bg-blue-500 rounded-full animate-pulse"></span>
                                        </p>
                                        <p translate="no" className="text-xl lg:text-2xl font-black text-gray-900 dark:text-white mt-2 lg:mt-3 tracking-tightest relative z-10 uppercase">
                                            {selectedUnit.responsible || 'SIN ASIGNAR'}
                                        </p>
                                    </div>

                                    <h3 className="text-[10px] lg:text-xs font-black text-gray-400 dark:text-zinc-500 uppercase tracking-widest flex items-center gap-2 pt-4">
                                        <Building2 size={14} />
                                        Información Complementaria
                                    </h3>
                                    <div className="grid grid-cols-2 gap-3 lg:gap-4">
                                        <div className="bg-gray-50 dark:bg-zinc-800/50 p-5 lg:p-6 rounded-[1.5rem] lg:rounded-[2rem] border border-gray-100 dark:border-zinc-800">
                                            <p className="text-[9px] lg:text-[10px] text-gray-400 dark:text-zinc-500 font-black uppercase tracking-widest">Bodega</p>
                                            <p className="text-lg lg:text-xl font-black text-gray-900 dark:text-white mt-1 lg:mt-2 tracking-tight">{selectedUnit.storageNumber || '-'}</p>
                                        </div>
                                        <div className="bg-gray-50 dark:bg-zinc-800/50 p-5 lg:p-6 rounded-[1.5rem] lg:rounded-[2rem] border border-gray-100 dark:border-zinc-800">
                                            <p className="text-[9px] lg:text-[10px] text-gray-400 dark:text-zinc-500 font-black uppercase tracking-widest">Estacionamiento</p>
                                            <p className="text-lg lg:text-xl font-black text-gray-900 dark:text-white mt-1 lg:mt-2 tracking-tight">{selectedUnit.parkingNumber || '-'}</p>
                                        </div>
                                    </div>

                                    {selectedUnit.observaciones && (
                                        <>
                                            <h3 className="text-[10px] lg:text-xs font-black text-gray-400 dark:text-zinc-500 uppercase tracking-widest flex items-center gap-2 pt-4">
                                                <MessageSquare size={14} />
                                                Comentarios / Observaciones
                                            </h3>
                                            <div className="bg-amber-50/30 dark:bg-zinc-800/80 p-6 rounded-[1.5rem] border border-amber-100/30 dark:border-zinc-800">
                                                <p className="text-sm font-semibold text-gray-700 dark:text-gray-200 italic leading-relaxed">
                                                    "{selectedUnit.observaciones}"
                                                </p>
                                            </div>
                                        </>
                                    )}
                                </div>
                            </div>
                            <div className="p-6 lg:p-10 border-t border-gray-100 dark:border-zinc-800 bg-white dark:bg-zinc-900 z-20 shrink-0">
                                <button onClick={() => setSelectedUnit(null)} className="w-full py-4 lg:py-5 bg-black dark:bg-white text-white dark:text-black rounded-xl lg:rounded-[1.5rem] text-sm font-black flex items-center justify-center gap-3">
                                    <CheckCircle2 size={20} />
                                    CERRAR DETALLE
                                </button>
                            </div>
                        </div>
                    </>
                )
            }

            {/* Overlays */}
            {
                (isExporting || isLoading) && (
                    <div className="fixed inset-0 bg-black/40 dark:bg-black/80 backdrop-blur-sm z-[200] flex items-center justify-center animate-in fade-in duration-300">
                        <div className="bg-white dark:bg-zinc-900 p-8 lg:p-10 rounded-[2rem] lg:rounded-[2.5rem] shadow-2xl flex flex-col items-center gap-6 border border-gray-100 dark:border-zinc-800 transition-all">
                            <div className="relative">
                                <div className="w-12 h-12 lg:w-16 lg:h-16 border-4 border-gray-100 dark:border-zinc-800 rounded-full"></div>
                                <div className="absolute top-0 left-0 w-12 h-12 lg:w-16 lg:h-16 border-4 border-black dark:border-white border-t-transparent rounded-full animate-spin"></div>
                            </div>
                            <div className="text-center space-y-2">
                                <p className="font-black text-gray-900 dark:text-white uppercase tracking-tighterest text-lg lg:text-xl">
                                    {isExporting ? 'Generando Reporte' : 'Sincronizando Datos'}
                                </p>
                                <p className="text-gray-400 dark:text-zinc-500 font-bold text-[10px] lg:text-xs uppercase tracking-widest px-4">
                                    {isExporting ? 'Ajustando matriz para calidad óptima...' : 'Obteniendo información actualizada...'}
                                </p>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* PDF Viewer Digital Modal */}
            {viewerPdfUrl && (
                <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 lg:p-10 animate-in fade-in duration-300">
                    <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={() => setViewerPdfUrl(null)}></div>
                    <div className="relative bg-white dark:bg-zinc-900 w-full h-full lg:w-[90%] lg:h-[90%] rounded-3xl overflow-hidden shadow-2xl flex flex-col animate-in zoom-in-95 duration-500">
                        {/* Header */}
                        <div className="p-4 lg:p-6 border-b border-gray-100 dark:border-zinc-800 flex items-center justify-between bg-white dark:bg-zinc-900 z-10 shrink-0">
                            <div className="flex items-center gap-4">
                                <div className="p-2 bg-red-50 dark:bg-red-900/20 rounded-xl">
                                    <FileText className="text-red-600 dark:text-red-400" size={24} />
                                </div>
                                <div>
                                    <h3 className="text-lg lg:text-xl font-black text-gray-900 dark:text-white tracking-tight leading-none">Visor de Acta Digital</h3>
                                    <p className="text-[10px] lg:text-xs text-gray-400 dark:text-zinc-500 mt-1 uppercase font-bold tracking-widest">Unidad: {selectedUnit?.number} • {selectedProject?.name}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-4">
                                <a 
                                    href={viewerPdfUrl.replace('?raw=1', '')} 
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="hidden lg:flex items-center gap-2 px-4 py-2 text-xs font-black text-gray-500 hover:text-black dark:hover:text-white transition-colors uppercase tracking-widest"
                                >
                                    <Download size={16} />
                                    Descargar Original
                                </a>
                                <button 
                                    onClick={() => setViewerPdfUrl(null)}
                                    className="w-10 h-10 lg:w-12 lg:h-12 flex items-center justify-center rounded-xl lg:rounded-2xl bg-gray-50 dark:bg-zinc-800 text-gray-400 hover:bg-red-500 hover:text-white transition-all duration-300 active:scale-90"
                                >
                                    <X size={24} />
                                </button>
                            </div>
                        </div>

                        {/* Content */}
                        <div className="flex-1 bg-gray-100 dark:bg-zinc-950 relative overflow-hidden">
                            <iframe 
                                src={`https://docs.google.com/viewer?url=${encodeURIComponent(viewerPdfUrl)}&embedded=true`} 
                                className="w-full h-full border-none"
                                title="Visor PDF"
                            />
                            
                            {/* Fallback / Footer Helper */}
                            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20">
                                <a 
                                    href={viewerPdfUrl} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="px-6 py-2 bg-white/10 dark:bg-black/20 backdrop-blur-md rounded-full text-[10px] font-black text-gray-400 hover:text-black dark:hover:text-white uppercase tracking-widest transition-all border border-gray-200/20 shadow-xl"
                                >
                                    ¿Problemas al visualizar? Haz clic aquí para abrir directo
                                </a>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div >
    );
}
