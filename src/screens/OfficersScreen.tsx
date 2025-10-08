import { useNavigate } from 'react-router-dom';
import { motion, useInView } from 'framer-motion';
import { useState, useRef, useEffect } from 'react';
import TiltedCard from '../components/TiltedCard';

interface Officer {
  name: string;
  image: string;
  title: string;
  classYear: string;
  yearsInClub: string;
}

const officers: Officer[] = [
  { name: 'Bella Pham', image: '/assets/images/officers/bella.png', title: 'President', classYear: '2026', yearsInClub: '4-year member' },
  { name: 'Jacob Harred', image: '/assets/images/officers/jacob.png', title: 'Vice President', classYear: '2026', yearsInClub: '4-year member' },
  { name: 'Shamoel Daudjee', image: '/assets/images/officers/shamoel.png', title: 'Vice President', classYear: '2027', yearsInClub: '3-year member' },
  { name: 'Nisha Raghavan', image: '/assets/images/officers/nisha.png', title: 'Secretary', classYear: '2026', yearsInClub: '4-year member' },
  { name: 'Simran Verma', image: '/assets/images/officers/simran.png', title: 'Secretary', classYear: '2028', yearsInClub: '2-year member' },
  { name: 'Cody Nguyen', image: '/assets/images/officers/cody.png', title: 'Treasurer', classYear: '2027', yearsInClub: '3-year member' },
  { name: 'Arjun Diwaker', image: '/assets/images/officers/arjun.png', title: 'Treasurer', classYear: '2027', yearsInClub: '2-year member' },
  { name: 'Parth Zanwar', image: '/assets/images/officers/parth.png', title: 'Web Master', classYear: '2027', yearsInClub: '3-year member' },
  { name: 'Nikhilesh Gnanaraj', image: '/assets/images/officers/nikkiiii.png', title: 'Web Master', classYear: '2027', yearsInClub: '3-year member' },
  { name: 'Nihika Sarada', image: '/assets/images/officers/nihika.png', title: 'Event Chairmen', classYear: '2027', yearsInClub: '3-year member' },
  { name: 'Gitali Yempati', image: '/assets/images/officers/gitali.png', title: 'Event Chairmen', classYear: '2028', yearsInClub: '2-year member' },
  { name: 'Madilyn Leal', image: '/assets/images/officers/madilyn.png', title: 'Event Chairmen', classYear: '2028', yearsInClub: '2-year member' },
  { name: 'Anika Miyapuram', image: '/assets/images/officers/anika.png', title: 'Editor', classYear: '2028', yearsInClub: '2-year member' },
  { name: 'Yuyan Lin', image: '/assets/images/officers/yuyan.png', title: 'Editor', classYear: '2026', yearsInClub: '4-year member' },
  { name: 'Gabriella Hodgson', image: '/assets/images/officers/gabriella.png', title: 'Publicity', classYear: '2026', yearsInClub: '3-year member' },
  { name: 'Winston Si', image: '/assets/images/officers/winston.png', title: 'Publicity', classYear: '2028', yearsInClub: '2-year member' },
  { name: 'Ruhi Gore', image: '/assets/images/officers/ruhi.png', title: 'Hours Manager', classYear: '2026', yearsInClub: '4-year member' },
  { name: 'Dhruv Mantri', image: '/assets/images/officers/dhruv.png', title: 'Hours Manager', classYear: '2027', yearsInClub: '2-year member' },
  { name: 'Jefferson Tran', image: '/assets/images/officers/jefferson.png', title: 'Hours Manager', classYear: '2026', yearsInClub: '3-year member' },
  { name: 'Anabella Vo', image: '/assets/images/officers/anabella.png', title: 'Communications', classYear: '2026', yearsInClub: '3-year member' },
  { name: 'Gabriela Carlos', image: '/assets/images/officers/gabriela.png', title: 'Communications', classYear: '2027', yearsInClub: '2-year member' },
];

const groupedOfficers = {
  'President': officers.filter(o => o.title === 'President'),
  'Vice President': officers.filter(o => o.title === 'Vice President'),
  'Secretary': officers.filter(o => o.title === 'Secretary'),
  'Treasurer': officers.filter(o => o.title === 'Treasurer'),
  'Web Master': officers.filter(o => o.title === 'Web Master'),
  'Event Chairmen': officers.filter(o => o.title === 'Event Chairmen'),
  'Editor': officers.filter(o => o.title === 'Editor'),
  'Publicity': officers.filter(o => o.title === 'Publicity'),
  'Hours Manager': officers.filter(o => o.title === 'Hours Manager'),
  'Communications': officers.filter(o => o.title === 'Communications'),
};

export default function OfficersScreen() {
  const navigate = useNavigate();
  const [currentGroup, setCurrentGroup] = useState(0);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const groupRefs = useRef<(HTMLDivElement | null)[]>([]);

  const positionGroups = Object.entries(groupedOfficers).filter(([_, officers]) => officers.length > 0);

  const scrollToGroup = (index: number) => {
    if (groupRefs.current[index] && scrollContainerRef.current) {
      groupRefs.current[index]?.scrollIntoView({
        behavior: 'smooth',
        block: 'start'
      });
      setCurrentGroup(index);
    }
  };

  useEffect(() => {
    const handleScroll = () => {
      if (scrollContainerRef.current) {
        const container = scrollContainerRef.current;
        const scrollTop = container.scrollTop;
        const containerHeight = container.clientHeight;
        
        // Calculate which group is currently in view
        const newCurrentGroup = Math.round(scrollTop / containerHeight);
        if (newCurrentGroup !== currentGroup && newCurrentGroup >= 0 && newCurrentGroup < positionGroups.length) {
          setCurrentGroup(newCurrentGroup);
        }
      }
    };

    const container = scrollContainerRef.current;
    if (container) {
      container.addEventListener('scroll', handleScroll);
      return () => container.removeEventListener('scroll', handleScroll);
    }
  }, [currentGroup, positionGroups.length]);


  return (
    <div className="fixed inset-0 bg-gradient-to-br from-blue-900 via-slate-800 to-blue-900 flex z-50">
      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="bg-slate-800 bg-opacity-80 border-b border-slate-700 py-6 px-6">
          <button 
            onClick={() => navigate('/home')} 
            className="text-blue-400 hover:text-blue-300 mb-4 flex items-center gap-2"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to Home
          </button>
          <h1 className="text-4xl font-bold text-blue-400 text-center mb-2">Meet Our Officers</h1>
          <p className="text-gray-400 text-center">The dedicated leaders of Cypress Ranch Key Club</p>
        </div>

        {/* Officers Grid - Vertical ScrollView */}
        <div className="flex-1 overflow-hidden">
          <div 
            ref={scrollContainerRef}
            className="h-full overflow-y-auto snap-y snap-mandatory scrollbar-hide"
            style={{ 
              scrollbarWidth: 'none', 
              msOverflowStyle: 'none'
            }}
          >
            {positionGroups.map(([position, positionOfficers], groupIndex) => {
              const groupRef = useRef<HTMLDivElement>(null);
              const isInView = useInView(groupRef, { 
                once: false,
                amount: 0.3,
                margin: "-100px 0px -100px 0px"
              });

              return (
                <div
                  key={position}
                  ref={(el) => {
                    groupRefs.current[groupIndex] = el;
                    (groupRef as any).current = el;
                  }}
                  className="h-screen snap-start flex flex-col items-center justify-center px-8 py-16"
                >
                  <div className="max-w-6xl mx-auto text-center">
                    <motion.h2 
                      className="text-4xl font-bold text-blue-400 mb-12"
                      initial={{ opacity: 0, y: -50 }}
                      animate={{ 
                        opacity: isInView ? 1 : 0,
                        y: isInView ? 0 : -50
                      }}
                      transition={{ duration: 0.6, ease: "easeOut" }}
                    >
                      {position}
                    </motion.h2>
                    <div className="flex flex-wrap justify-center gap-8">
                    {positionOfficers.map((officer, index) => (
                      <motion.div 
                        key={index} 
                        className="w-full sm:w-80"
                        initial={{ opacity: 0, y: 50 }}
                        animate={{ 
                          opacity: isInView ? 1 : 0,
                          y: isInView ? 0 : 50
                        }}
                        transition={{ 
                          duration: 0.6, 
                          delay: index * 0.1,
                          ease: "easeOut"
                        }}
                      >
                      {/* Officer Card with 3D Tilt Effect - Full Image Card */}
                      <TiltedCard
                        imageSrc={officer.image}
                        altText={officer.name}
                        containerHeight="400px"
                        containerWidth="100%"
                        imageHeight="100%"
                        imageWidth="100%"
                        scaleOnHover={1.05}
                        rotateAmplitude={8}
                        showMobileWarning={false}
                        showTooltip={false}
                        displayOverlayContent={true}
                        overlayContent={
                          <div className="absolute inset-0 pointer-events-none">
                            {/* Role Tag - Left Side */}
                            <div className="absolute top-4 left-4 z-50">
                              <div className="bg-black bg-opacity-70 backdrop-blur-sm px-3 py-1.5 rounded-full border border-white border-opacity-20">
                                <span className="text-white text-xs font-medium">{position}</span>
                              </div>
                            </div>

                            {/* Bottom Overlay - Name and Details */}
                            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 via-black/60 to-transparent px-4 py-3">
                              <h4 className="text-base font-medium text-white drop-shadow-lg mb-1">{officer.name}</h4>
                              <p className="text-gray-300 text-sm">Class of {officer.classYear}</p>
                            </div>
                          </div>
                        }
                      >
                        {/* Full Image Card Content */}
                        <div className="relative w-full h-full rounded-2xl overflow-hidden shadow-xl">
                          <img
                            src={officer.image}
                            alt={officer.name}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              target.src = '/assets/icon.png';
                            }}
                          />
                        </div>
                      </TiltedCard>
                      </motion.div>
                    ))}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Right Sidebar Navigation - Always Visible */}
      <div className="w-64 bg-white bg-opacity-5 backdrop-blur-md border-l border-white border-opacity-20 flex flex-col sticky top-0 h-screen">
        {/* Spacer */}
        <div className="h-32"></div>
        
        {/* Position Navigation */}
        <div className="flex-1 py-8 overflow-y-auto scrollbar-hide" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
          <div className="px-6 mb-8">
            <div className="w-12 h-px bg-gradient-to-r from-blue-400 to-transparent"></div>
          </div>
          <div className="space-y-3 px-4">
            {positionGroups.map(([position], index) => (
              <button
                key={position}
                onClick={() => scrollToGroup(index)}
                className={`w-full text-left px-4 py-3 text-sm font-medium transition-all duration-300 rounded-lg ${
                  index === currentGroup
                    ? 'bg-blue-500 bg-opacity-25 text-blue-300 border border-blue-400 border-opacity-30 backdrop-blur-sm shadow-lg shadow-blue-500 shadow-opacity-20'
                    : 'text-gray-400 hover:bg-white hover:bg-opacity-10 hover:text-white hover:backdrop-blur-sm hover:shadow-md hover:shadow-white hover:shadow-opacity-10'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-2 h-2 rounded-full transition-all duration-300 ${
                    index === currentGroup ? 'bg-blue-400' : 'bg-gray-500'
                  }`}></div>
                  <span className="tracking-wide">{position}</span>
                </div>
              </button>
            ))}
          </div>
        </div>
        
        {/* Bottom spacer */}
        <div className="h-16"></div>
      </div>
    </div>
  );
}
