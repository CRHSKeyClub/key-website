import { useRef, useEffect } from 'react';
import { View, Image, Platform } from 'react-native';

export default function TiltedCard({
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
}) {
  const containerRef = useRef(null);
  const innerRef = useRef(null);
  const tooltipRef = useRef(null);

  useEffect(() => {
    if (Platform.OS !== 'web' || !containerRef.current || !innerRef.current) return;

    const container = containerRef.current;
    const inner = innerRef.current;
    const tooltip = tooltipRef.current;

    let rotateX = 0;
    let rotateY = 0;
    let scale = 1;
    let opacity = 0;

    function handleMouse(e) {
      const rect = container.getBoundingClientRect();
      const offsetX = e.clientX - rect.left - rect.width / 2;
      const offsetY = e.clientY - rect.top - rect.height / 2;

      rotateX = (offsetY / (rect.height / 2)) * -rotateAmplitude;
      rotateY = (offsetX / (rect.width / 2)) * rotateAmplitude;

      // Apply transform directly to DOM element
      inner.style.transform = `rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale(${scale})`;

      // Update tooltip position
      if (tooltip && showTooltip) {
        tooltip.style.left = `${e.clientX - rect.left}px`;
        tooltip.style.top = `${e.clientY - rect.top}px`;
      }
    }

    function handleMouseEnter() {
      scale = scaleOnHover;
      opacity = 1;
      inner.style.transform = `rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale(${scale})`;
      if (tooltip) {
        tooltip.style.opacity = opacity;
      }
    }

    function handleMouseLeave() {
      scale = 1;
      rotateX = 0;
      rotateY = 0;
      opacity = 0;
      inner.style.transform = `rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale(${scale})`;
      if (tooltip) {
        tooltip.style.opacity = opacity;
      }
    }

    // Add event listeners
    container.addEventListener('mousemove', handleMouse);
    container.addEventListener('mouseenter', handleMouseEnter);
    container.addEventListener('mouseleave', handleMouseLeave);

    // Cleanup
    return () => {
      container.removeEventListener('mousemove', handleMouse);
      container.removeEventListener('mouseenter', handleMouseEnter);
      container.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, [rotateAmplitude, scaleOnHover, showTooltip]);

  if (Platform.OS === 'web') {
    return (
      <div
        ref={containerRef}
        style={{
          position: 'relative',
          width: containerWidth,
          height: containerHeight,
          perspective: '800px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <div
          ref={innerRef}
          style={{
            position: 'relative',
            width: imageWidth,
            height: imageHeight,
            transformStyle: 'preserve-3d',
            transition: 'transform 0.1s ease-out',
          }}
        >
          <img
            src={imageSrc}
            alt={altText}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              objectFit: 'cover',
              borderRadius: 15,
              width: imageWidth,
              height: imageHeight
            }}
          />

          {displayOverlayContent && overlayContent && (
            <div style={{
              position: 'absolute',
              top: 0,
              left: 0,
              zIndex: 2,
              width: imageWidth,
              height: imageHeight
            }}>{overlayContent}</div>
          )}
        </div>

        {showTooltip && (
          <div
            ref={tooltipRef}
            style={{
              pointerEvents: 'none',
              position: 'absolute',
              left: 0,
              top: 0,
              borderRadius: 4,
              backgroundColor: '#fff',
              padding: '4px 10px',
              fontSize: 10,
              color: '#2d2d2d',
              opacity: 0,
              zIndex: 3,
              transition: 'opacity 0.2s ease-out',
            }}
          >
            {captionText}
          </div>
        )}
      </div>
    );
  }

  // Mobile fallback
  return (
    <View
      style={{
        width: containerWidth,
        height: containerHeight,
        justifyContent: 'center',
        alignItems: 'center',
      }}
    >
      <Image
        source={imageSrc}
        style={{
          width: imageWidth,
          height: imageHeight,
          borderRadius: 15,
        }}
        resizeMode="cover"
      />
      {displayOverlayContent && overlayContent && (
        <View style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: imageWidth,
          height: imageHeight,
        }}>
          {overlayContent}
        </View>
      )}
    </View>
  );
}
