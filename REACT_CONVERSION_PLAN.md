# React Conversion Plan: Officers Screen

## Overview
This document outlines the step-by-step conversion of the Officers screen from React Native to pure React with TypeScript.

## Project Structure
```
src/
├── components/
│   ├── TiltedCard/
│   │   ├── TiltedCard.tsx
│   │   ├── TiltedCard.module.css
│   │   └── index.ts
│   ├── OfficerCard/
│   │   ├── OfficerCard.tsx
│   │   ├── OfficerCard.module.css
│   │   └── index.ts
│   └── Layout/
│       ├── Header.tsx
│       └── Navigation.tsx
├── screens/
│   └── OfficersScreen.tsx
├── types/
│   └── officer.ts
├── hooks/
│   └── useOfficers.ts
└── styles/
    └── globals.css
```

## Step 1: TypeScript Types

### types/officer.ts
```typescript
export interface Officer {
  id: string;
  name: string;
  position: string;
  classYear: string;
  memberYears: number;
  imageSource: string;
}

export interface OfficersGroup {
  role: string;
  officers: Officer[];
}
```

## Step 2: React Hooks

### hooks/useOfficers.ts
```typescript
import { useState, useEffect } from 'react';
import { Officer, OfficersGroup } from '../types/officer';

export const useOfficers = () => {
  const [officers, setOfficers] = useState<Officer[]>([]);
  const [groupedOfficers, setGroupedOfficers] = useState<OfficersGroup[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch officers data
    fetchOfficers();
  }, []);

  const fetchOfficers = async () => {
    try {
      // Your existing data fetching logic
      const officersData = [
        {
          id: '1',
          name: 'Bella Pham',
          position: 'President',
          classYear: '2026',
          memberYears: 4,
          imageSource: '/assets/images/officers/bella.png'
        },
        // ... other officers
      ];
      
      setOfficers(officersData);
      setGroupedOfficers(groupOfficersByRole(officersData));
    } catch (error) {
      console.error('Error fetching officers:', error);
    } finally {
      setLoading(false);
    }
  };

  const groupOfficersByRole = (officers: Officer[]): OfficersGroup[] => {
    const groups = officers.reduce((acc, officer) => {
      const existingGroup = acc.find(group => group.role === officer.position);
      if (existingGroup) {
        existingGroup.officers.push(officer);
      } else {
        acc.push({ role: officer.position, officers: [officer] });
      }
      return acc;
    }, [] as OfficersGroup[]);

    return groups.sort((a, b) => {
      const roleOrder = ['President', 'Vice President', 'Treasurer', 'Secretary', 'Web Master'];
      return roleOrder.indexOf(a.role) - roleOrder.indexOf(b.role);
    });
  };

  return { officers, groupedOfficers, loading, refetch: fetchOfficers };
};
```

## Step 3: Pure React TiltedCard Component

### components/TiltedCard/TiltedCard.tsx
```typescript
import React, { useRef, useEffect } from 'react';
import styles from './TiltedCard.module.css';

interface TiltedCardProps {
  imageSrc: string;
  altText?: string;
  captionText?: string;
  containerHeight?: number;
  containerWidth?: string;
  imageHeight?: number;
  imageWidth?: string;
  scaleOnHover?: number;
  rotateAmplitude?: number;
  showMobileWarning?: boolean;
  showTooltip?: boolean;
  overlayContent?: React.ReactNode;
  displayOverlayContent?: boolean;
}

export const TiltedCard: React.FC<TiltedCardProps> = ({
  imageSrc,
  altText = 'Tilted card image',
  captionText = '',
  containerHeight = 300,
  containerWidth = '100%',
  imageHeight = 300,
  imageWidth = '100%',
  scaleOnHover = 1.1,
  rotateAmplitude = 14,
  showMobileWarning = true,
  showTooltip = true,
  overlayContent = null,
  displayOverlayContent = false
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current || !innerRef.current) return;

    const container = containerRef.current;
    const inner = innerRef.current;
    const tooltip = tooltipRef.current;

    let rotateX = 0;
    let rotateY = 0;
    let scale = 1;
    let opacity = 0;

    const handleMouse = (e: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      const offsetX = e.clientX - rect.left - rect.width / 2;
      const offsetY = e.clientY - rect.top - rect.height / 2;

      rotateX = (offsetY / (rect.height / 2)) * -rotateAmplitude;
      rotateY = (offsetX / (rect.width / 2)) * rotateAmplitude;

      inner.style.transform = `rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale(${scale})`;

      if (tooltip && showTooltip) {
        tooltip.style.left = `${e.clientX - rect.left}px`;
        tooltip.style.top = `${e.clientY - rect.top}px`;
      }
    };

    const handleMouseEnter = () => {
      scale = scaleOnHover;
      opacity = 1;
      inner.style.transform = `rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale(${scale})`;
      if (tooltip) {
        tooltip.style.opacity = opacity.toString();
      }
    };

    const handleMouseLeave = () => {
      scale = 1;
      rotateX = 0;
      rotateY = 0;
      opacity = 0;
      inner.style.transform = `rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale(${scale})`;
      if (tooltip) {
        tooltip.style.opacity = opacity.toString();
      }
    };

    container.addEventListener('mousemove', handleMouse);
    container.addEventListener('mouseenter', handleMouseEnter);
    container.addEventListener('mouseleave', handleMouseLeave);

    return () => {
      container.removeEventListener('mousemove', handleMouse);
      container.removeEventListener('mouseenter', handleMouseEnter);
      container.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, [rotateAmplitude, scaleOnHover, showTooltip]);

  return (
    <div
      ref={containerRef}
      className={styles.container}
      style={{
        height: containerHeight,
        width: containerWidth,
      }}
    >
      <div
        ref={innerRef}
        className={styles.inner}
        style={{
          width: imageWidth,
          height: imageHeight,
        }}
      >
        <img
          src={imageSrc}
          alt={altText}
          className={styles.image}
          style={{
            width: imageWidth,
            height: imageHeight,
          }}
        />

        {displayOverlayContent && overlayContent && (
          <div className={styles.overlay}>
            {overlayContent}
          </div>
        )}
      </div>

      {showTooltip && (
        <div
          ref={tooltipRef}
          className={styles.tooltip}
        >
          {captionText}
        </div>
      )}
    </div>
  );
};
```

### components/TiltedCard/TiltedCard.module.css
```css
.container {
  position: relative;
  perspective: 800px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.inner {
  position: relative;
  transform-style: preserve-3d;
  transition: transform 0.1s ease-out;
}

.image {
  position: absolute;
  top: 0;
  left: 0;
  object-fit: cover;
  border-radius: 15px;
}

.overlay {
  position: absolute;
  top: 0;
  left: 0;
  z-index: 2;
  width: 100%;
  height: 100%;
}

.tooltip {
  pointer-events: none;
  position: absolute;
  left: 0;
  top: 0;
  border-radius: 4px;
  background-color: #fff;
  padding: 4px 10px;
  font-size: 10px;
  color: #2d2d2d;
  opacity: 0;
  z-index: 3;
  transition: opacity 0.2s ease-out;
}
```

## Step 4: Officer Card Component

### components/OfficerCard/OfficerCard.tsx
```typescript
import React from 'react';
import { Officer } from '../../types/officer';
import { TiltedCard } from '../TiltedCard';
import styles from './OfficerCard.module.css';

interface OfficerCardProps {
  officer: Officer;
  index: number;
  cardWidth: number;
  cardHeight: number;
}

export const OfficerCard: React.FC<OfficerCardProps> = ({
  officer,
  index,
  cardWidth,
  cardHeight
}) => {
  const overlayContent = (
    <div className={styles.overlay}>
      <img 
        src="/assets/images/keyclublogo.png"
        className={styles.logo}
        alt="Key Club Logo"
      />
      
      <div className={styles.content}>
        <div className={styles.photoContainer}>
          <img
            src={officer.imageSource}
            alt={officer.name}
            className={styles.photo}
          />
        </div>
        
        <div className={styles.info}>
          <h3 className={styles.name}>{officer.name}</h3>
          <p className={styles.classInfo}>Class of {officer.classYear}</p>
          <p className={styles.memberInfo}>{officer.memberYears}-year member</p>
        </div>
        
        <div className={styles.positionBanner}>
          {officer.position}
        </div>
      </div>
    </div>
  );

  return (
    <TiltedCard
      imageSrc={officer.imageSource}
      altText={`${officer.name} - ${officer.position}`}
      captionText={`${officer.name} - ${officer.position}`}
      containerHeight={cardHeight}
      containerWidth={cardWidth}
      imageHeight={cardHeight}
      imageWidth={cardWidth}
      rotateAmplitude={14}
      scaleOnHover={1.1}
      showMobileWarning={false}
      showTooltip={true}
      displayOverlayContent={true}
      overlayContent={overlayContent}
    />
  );
};
```

## Step 5: Main Officers Screen

### screens/OfficersScreen.tsx
```typescript
import React from 'react';
import { useOfficers } from '../hooks/useOfficers';
import { OfficerCard } from '../components/OfficerCard';
import styles from './OfficersScreen.module.css';

export const OfficersScreen: React.FC = () => {
  const { groupedOfficers, loading } = useOfficers();

  if (loading) {
    return (
      <div className={styles.loading}>
        <h2>Loading officers...</h2>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1 className={styles.title}>Meet Our Officers</h1>
        <p className={styles.subtitle}>The dedicated leaders of Cypress Ranch Key Club</p>
      </header>

      <main className={styles.main}>
        {groupedOfficers.map((group) => (
          <section key={group.role} className={styles.roleSection}>
            <h2 className={styles.roleTitle}>{group.role}</h2>
            <div className={styles.cardsContainer}>
              {group.officers.map((officer, index) => (
                <OfficerCard
                  key={officer.id}
                  officer={officer}
                  index={index}
                  cardWidth={280}
                  cardHeight={350}
                />
              ))}
            </div>
          </section>
        ))}
      </main>
    </div>
  );
};
```

## Step 6: CSS Styling

### screens/OfficersScreen.module.css
```css
.container {
  min-height: 100vh;
  background: linear-gradient(135deg, #1a365d 0%, #2d3748 100%);
  padding: 2rem;
}

.header {
  text-align: center;
  margin-bottom: 3rem;
}

.title {
  font-size: 3rem;
  color: #4299e1;
  margin-bottom: 0.5rem;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
}

.subtitle {
  font-size: 1.2rem;
  color: #e2e8f0;
  opacity: 0.9;
}

.main {
  max-width: 1200px;
  margin: 0 auto;
}

.roleSection {
  margin-bottom: 4rem;
}

.roleTitle {
  font-size: 2rem;
  color: #4299e1;
  text-align: center;
  margin-bottom: 2rem;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
}

.cardsContainer {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 2rem;
  justify-items: center;
  padding: 0 1rem;
}

.loading {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  background: linear-gradient(135deg, #1a365d 0%, #2d3748 100%);
}

.loading h2 {
  color: #4299e1;
  font-size: 1.5rem;
}

@media (max-width: 768px) {
  .container {
    padding: 1rem;
  }
  
  .title {
    font-size: 2rem;
  }
  
  .cardsContainer {
    grid-template-columns: 1fr;
    gap: 1.5rem;
  }
}
```

## Implementation Steps

1. **Create new React TypeScript project**
   ```bash
   npx create-react-app key-club-web --template typescript
   cd key-club-web
   npm install
   ```

2. **Set up project structure**
   - Create the folder structure above
   - Install additional dependencies if needed

3. **Convert components one by one**
   - Start with types and hooks
   - Convert TiltedCard component
   - Convert OfficerCard component
   - Convert main screen

4. **Add styling**
   - Use CSS Modules for component styling
   - Add responsive design
   - Test on different screen sizes

5. **Test and optimize**
   - Test all functionality
   - Optimize performance
   - Add error handling

## Benefits of This Approach

1. **Pure React**: No React Native overhead
2. **TypeScript**: Better type safety and developer experience
3. **CSS Modules**: Scoped styling without conflicts
4. **Modern Hooks**: Clean, reusable logic
5. **Responsive Design**: Works on all screen sizes
6. **Performance**: Direct DOM manipulation for animations

This conversion maintains all existing functionality while providing a better web experience.
