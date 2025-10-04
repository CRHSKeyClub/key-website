import { useRef, useState } from 'react';
import { View, Image, Text, Platform } from 'react-native';

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
  const ref = useRef(null);

  const [rotateX, setRotateX] = useState(0);
  const [rotateY, setRotateY] = useState(0);
  const [scale, setScale] = useState(1);
  const [opacity, setOpacity] = useState(0);
  const [x, setX] = useState(0);
  const [y, setY] = useState(0);
  const [lastY, setLastY] = useState(0);

  function handleMouse(e) {
    if (!ref.current || Platform.OS !== 'web') return;

    const rect = ref.current.getBoundingClientRect();
    const offsetX = e.clientX - rect.left - rect.width / 2;
    const offsetY = e.clientY - rect.top - rect.height / 2;

    const rotationX = (offsetY / (rect.height / 2)) * -rotateAmplitude;
    const rotationY = (offsetX / (rect.width / 2)) * rotateAmplitude;

    setRotateX(rotationX);
    setRotateY(rotationY);
    setX(e.clientX - rect.left);
    setY(e.clientY - rect.top);
    setLastY(offsetY);
  }

  function handleMouseEnter() {
    if (Platform.OS !== 'web') return;
    setScale(scaleOnHover);
    setOpacity(1);
  }

  function handleMouseLeave() {
    if (Platform.OS !== 'web') return;
    setOpacity(0);
    setScale(1);
    setRotateX(0);
    setRotateY(0);
  }

  if (Platform.OS === 'web') {
    return (
      <div
        ref={ref}
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
        onMouseMove={handleMouse}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        <div
          style={{
            position: 'relative',
            width: imageWidth,
            height: imageHeight,
            transformStyle: 'preserve-3d',
            transform: `rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale(${scale})`,
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
            style={{
              pointerEvents: 'none',
              position: 'absolute',
              left: x,
              top: y,
              borderRadius: 4,
              backgroundColor: '#fff',
              padding: '4px 10px',
              fontSize: 10,
              color: '#2d2d2d',
              opacity: opacity,
              zIndex: 3,
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
