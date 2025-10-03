import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Image,
  Dimensions,
  SafeAreaView,
  StatusBar,
  ImageBackground,
  ScrollView,
  Animated,
  TouchableOpacity,
  Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

// Add floating sparkles component at the top level
const FloatingSparkles = () => {
  const sparkles = [...Array(12)].map((_, i) => {
    const sparkleAnim = useRef(new Animated.Value(0)).current;
    
    useEffect(() => {
      Animated.loop(
        Animated.sequence([
          Animated.timing(sparkleAnim, {
            toValue: 1,
            duration: 5000 + Math.random() * 3000,
            useNativeDriver: false,
          }),
          Animated.timing(sparkleAnim, {
            toValue: 0,
            duration: 5000 + Math.random() * 3000,
            useNativeDriver: false,
          })
        ])
      ).start();
    }, []);

    return (
      <Animated.View
        key={i}
        style={[
          styles.floatingSparkle,
          {
            left: Math.random() * screenWidth,
            top: Math.random() * screenHeight,
            opacity: sparkleAnim,
            transform: [
              { translateY: sparkleAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [0, -25 - Math.random() * 30]
              }) },
              { scale: sparkleAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [0.3, 1.1]
              }) }
            ]
          }
        ]}
      />
    );
  });

  return <>{sparkles}</>;
};

const AnimatedOfficerCard = ({ item, index, cardWidth, cardHeight, numColumns, isWeb, isMobile }) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const translateXAnim = useRef(new Animated.Value(0)).current;
  const translateYAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.3)).current;
  const rotateXAnim = useRef(new Animated.Value(0)).current;
  const rotateYAnim = useRef(new Animated.Value(0)).current;
  const rotateZAnim = useRef(new Animated.Value(0)).current;
  const floatAnim = useRef(new Animated.Value(0)).current;

  // Generate random flying start position and rotation for "flying posters" effect
  const randomStart = useRef({
    x: (Math.random() - 0.5) * (isWeb ? 600 : 400),
    y: (Math.random() - 0.5) * (isWeb ? 600 : 400),
    rotateX: (Math.random() - 0.5) * 90,
    rotateY: (Math.random() - 0.5) * 90,
    rotateZ: (Math.random() - 0.5) * 180,
  }).current;

  // Flying Posters Animation - inspired by ReactBits
  useEffect(() => {
    console.log(`Card ${index} (${item.name}): Flying posters animation starting...`);
    
    // Set initial off-screen flying position with random 3D rotation
    fadeAnim.setValue(0);
    translateXAnim.setValue(randomStart.x);
    translateYAnim.setValue(randomStart.y);
    scaleAnim.setValue(0.3);
    rotateXAnim.setValue(randomStart.rotateX);
    rotateYAnim.setValue(randomStart.rotateY);
    rotateZAnim.setValue(randomStart.rotateZ);
    floatAnim.setValue(0);
    
    // Stagger delay for cascading effect
    const delay = index * 120;
    
    console.log(`Card ${index}: Starting with delay ${delay}ms from position:`, randomStart);

    // Flying posters entrance animation with 3D transforms
    const flyInAnimation = Animated.parallel([
      // Fade in
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 1000,
        delay,
        useNativeDriver: false,
      }),
      // Fly to center from random position
      Animated.spring(translateXAnim, {
        toValue: 0,
        delay,
        tension: 35,
        friction: 12,
        useNativeDriver: false,
      }),
      Animated.spring(translateYAnim, {
        toValue: 0,
        delay,
        tension: 35,
        friction: 12,
        useNativeDriver: false,
      }),
      // Scale up
      Animated.spring(scaleAnim, {
        toValue: 1,
        delay,
        tension: 40,
        friction: 10,
        useNativeDriver: false,
      }),
      // Rotate to flat on X axis
      Animated.spring(rotateXAnim, {
        toValue: 0,
        delay,
        tension: 35,
        friction: 12,
        useNativeDriver: false,
      }),
      // Rotate to flat on Y axis
      Animated.spring(rotateYAnim, {
        toValue: 0,
        delay,
        tension: 35,
        friction: 12,
        useNativeDriver: false,
      }),
      // Rotate to flat on Z axis
      Animated.spring(rotateZAnim, {
        toValue: 0,
        delay,
        tension: 35,
        friction: 12,
        useNativeDriver: false,
      }),
    ]);

    // Start the flying animation
    flyInAnimation.start(({ finished }) => {
      console.log(`Card ${index}: Flying animation finished:`, finished);
      
      // After flying in, start gentle floating
      Animated.loop(
        Animated.sequence([
          Animated.timing(floatAnim, {
            toValue: 1,
            duration: 2500 + Math.random() * 1000,
            useNativeDriver: false,
          }),
          Animated.timing(floatAnim, {
            toValue: 0,
            duration: 2500 + Math.random() * 1000,
            useNativeDriver: false,
          })
        ])
      ).start();
    });

    return () => {
      // Cleanup
      fadeAnim.stopAnimation();
      translateXAnim.stopAnimation();
      translateYAnim.stopAnimation();
      scaleAnim.stopAnimation();
      rotateXAnim.stopAnimation();
      rotateYAnim.stopAnimation();
      rotateZAnim.stopAnimation();
      floatAnim.stopAnimation();
    };
  }, [index]);

  const handlePress = () => {
    // Bounce animation on press
    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 0.9,
        duration: 100,
        useNativeDriver: false,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 300,
        friction: 6,
        useNativeDriver: false,
      }),
    ]).start();
  };

  // Calculate floating offset with slight rotation
  const floatY = floatAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -12],
  });

  const floatRotate = floatAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['-3deg', '3deg'],
  });

  // Interpolate rotation values
  const rotateXDeg = rotateXAnim.interpolate({
    inputRange: [-90, 90],
    outputRange: ['-90deg', '90deg'],
  });

  const rotateYDeg = rotateYAnim.interpolate({
    inputRange: [-90, 90],
    outputRange: ['-90deg', '90deg'],
  });

  const rotateZDeg = rotateZAnim.interpolate({
    inputRange: [-180, 180],
    outputRange: ['-180deg', '180deg'],
  });

  return (
    <Animated.View
      style={[
        styles.cardContainer,
        {
          width: cardWidth,
          marginLeft: index % numColumns === 0 ? 0 : 10,
          marginBottom: isWeb ? 25 : 20,
          opacity: fadeAnim,
          transform: [
            { perspective: 1200 },
            { translateX: translateXAnim },
            { translateY: Animated.add(translateYAnim, floatY) },
            { scale: scaleAnim },
            { rotateX: rotateXDeg },
            { rotateY: rotateYDeg },
            { rotateZ: rotateZDeg },
          ],
        },
      ]}
    >
      <TouchableOpacity
        style={[styles.officerCard, { height: cardHeight }]}
        onPress={handlePress}
        activeOpacity={0.9}
      >
        {/* Animated Key Club logo */}
        <Animated.Image
          source={require('../assets/images/keyclublogo.png')}
          style={[
            styles.keyClubLogo,
            {
              transform: [{ rotate: rotateZDeg }],
            },
          ]}
          resizeMode="contain"
        />
        
        {/* Background with string lights */}
        <ImageBackground
          source={require('../assets/images/string_lights_bg.png')}
          style={styles.cardBackground}
          resizeMode="cover"
        >
          {/* Officer photo with scale animation */}
          <Animated.View
            style={[
              styles.photoContainer,
              {
                width: cardWidth - 40,
                height: isWeb ? 220 : 200,
                marginTop: isWeb ? 35 : 30,
                transform: [{ scale: scaleAnim }],
              },
            ]}
          >
            <Image
              source={item.imageSource}
              style={styles.officerImage}
              resizeMode="cover"
            />
          </Animated.View>
          
          {/* Officer name with fade animation */}
          <Animated.View
            style={[
              styles.nameContainer,
            ]}
          >
            <Text style={[
              styles.officerName,
              { fontSize: isWeb ? 22 : isMobile ? 16 : 18 }
            ]}>
              {item.name}
            </Text>
          </Animated.View>
          
          {/* Officer details with fade animation */}
          <Animated.View
            style={[
              styles.detailsContainer,
              {
                opacity: fadeAnim,
              },
            ]}
          >
            <Text style={[
              styles.classInfo,
              { fontSize: isWeb ? 16 : 14 }
            ]}>
              Class of {item.classYear}
            </Text>
            <Text style={[
              styles.memberInfo,
              { fontSize: isWeb ? 16 : 14 }
            ]}>
              {item.memberYears}-year member
            </Text>
          </Animated.View>
        </ImageBackground>
        
        {/* Floral border */}
        <Image
          source={require('../assets/images/floral_border.png')}
          style={styles.floralBorder}
          resizeMode="cover"
        />
        
        {/* Position banner with pulse animation */}
        <AnimatedPositionBanner
          position={item.position}
          isWeb={isWeb}
          isMobile={isMobile}
          delay={(index % numColumns) * 200 + 500}
        />
      </TouchableOpacity>
    </Animated.View>
  );
};

const AnimatedPositionBanner = ({ position, isWeb, isMobile, delay }) => {
  const slideUpAnim = useRef(new Animated.Value(30)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Reset animations on mount
    slideUpAnim.setValue(30);
    opacityAnim.setValue(0);

    // Initial slide up animation
    Animated.parallel([
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 500,
        delay,
        useNativeDriver: false,
      }),
      Animated.spring(slideUpAnim, {
        toValue: 0,
        delay,
        tension: 80,
        friction: 8,
        useNativeDriver: false,
      }),
    ]).start();

    // Simple entrance animation only
    const pulseTimeout = setTimeout(() => {
      // No continuous animations
    }, delay + 800);

    return () => {
      clearTimeout(pulseTimeout);
    };
  }, [delay]);

  return (
    <Animated.View
      style={[
        styles.positionContainer,
        {
          opacity: opacityAnim,
          transform: [
            { translateY: slideUpAnim },
          ],
        },
      ]}
    >

      
      <Text style={[
        styles.positionText,
        { fontSize: isWeb ? 16 : isMobile ? 14 : 15 }
      ]}>
        {position}
      </Text>
    </Animated.View>
  );
};

export default function OfficersScreen({ navigation }) {
  const [screenData, setScreenData] = useState(Dimensions.get('window'));
  const headerFadeAnim = useRef(new Animated.Value(0)).current;
  const headerSlideAnim = useRef(new Animated.Value(-50)).current;
  const headerAnim = useRef(new Animated.Value(-100)).current;
  const titleAnim = useRef(new Animated.Value(0)).current;
  
  useEffect(() => {
    const onChange = (result) => {
      setScreenData(result.window);
    };
    
    const subscription = Dimensions.addEventListener('change', onChange);
    
    // Reset and animate header every time screen loads
    headerFadeAnim.setValue(0);
    headerSlideAnim.setValue(-50);
    
    Animated.parallel([
      Animated.timing(headerFadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: false,
      }),
      Animated.spring(headerSlideAnim, {
        toValue: 0,
        tension: 60,
        friction: 8,
        useNativeDriver: false,
      }),
    ]).start();

    // Start entrance animations
    Animated.sequence([
      Animated.timing(headerAnim, {
        toValue: 0,
        duration: 600,
        useNativeDriver: false,
      }),
      Animated.timing(titleAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: false,
      })
    ]).start();
    
    return () => subscription?.remove();
  }, []);

  // Calculate responsive layout
  const isWeb = screenData.width > 768;
  const isTablet = screenData.width > 480 && screenData.width <= 768;
  const isMobile = screenData.width <= 480;
  
  // Determine number of columns based on screen size
  const getNumColumns = () => {
    if (isWeb) return screenData.width > 1200 ? 4 : 3;
    if (isTablet) return 3;
    return 2; // mobile
  };
  
  const numColumns = getNumColumns();
  const cardWidth = (screenData.width - (20 * 2) - (10 * (numColumns - 1))) / numColumns;
  const cardHeight = isWeb ? 520 : 480;

  // Officer data
  const officers = [
    {
      id: '1',
      name: "Bella Pham",
      position: "President",
      classYear: "2026",
      memberYears: "4",
      imageSource: require('../assets/images/officers/bella.png'),
    },
    {
      id: '2',
      name: "Jacob Harred",
      position: "Vice President",
      classYear: "2026",
      memberYears: "4",
      imageSource: require('../assets/images/officers/jacob.png'),
    },
    {
      id: '3',
      name: "Shamoel Daudjee",
      position: "Vice President",
      classYear: "2027",
      memberYears: "3",
      imageSource: require('../assets/images/officers/shamoel.png'),
    },
    {
      id: '4',
      name: "Cody Nguyen",
      position: "Treasurer",
      classYear: "2027",
      memberYears: "3",
      imageSource: require('../assets/images/officers/cody.png'),
    },
    {
      id: '5',
      name: "Svar Chandak",
      position: "Treasurer",
      classYear: "2027",
      memberYears: "3",
      imageSource: require('../assets/images/officers/svar.png'),
    },
    {
      id: '6',
      name: "Nisha Raghavan",
      position: "Secretary",
      classYear: "2026",
      memberYears: "4",
      imageSource: require('../assets/images/officers/nisha.png'),
    },
    {
      id: '7',
      name: "Simran Verma",
      position: "Secretary",
      classYear: "2028",
      memberYears: "2",
      imageSource: require('../assets/images/officers/simran.png'),
    },
    {
      id: '8',
      name: "Parth Zanwar",
      position: "Web Master",
      classYear: "2027",
      memberYears: "3",
      imageSource: require('../assets/images/officers/parth.png'),
    },
    {
      id: '9',
      name: "Nikhilesh Gnanaraj",
      position: "Web Master",
      classYear: "2027",
      memberYears: "3",
      imageSource: require('../assets/images/officers/nikkiiii.png'),
    },
    {
      id: '10',
      name: "Nihika Sarada",
      position: "Event Chairmen",
      classYear: "2027",
      memberYears: "3",
      imageSource: require('../assets/images/officers/nihika.png'),
    },
    {
      id: '11',
      name: "Gitali Yempati",
      position: "Event Chairmen",
      classYear: "2028",
      memberYears: "2",
      imageSource: require('../assets/images/officers/gitali.png'),
    },
    {
      id: '12',
      name: "Madilyn Leal",
      position: "Event Chairmen",
      classYear: "2028",
      memberYears: "2",
      imageSource: require('../assets/images/officers/madilyn.png'),
    },
    {
      id: '13',
      name: "Anika Miyapuram",
      position: "Editor",
      classYear: "2028",
      memberYears: "2",
      imageSource: require('../assets/images/officers/anika.png'),
    },
    {
      id: '14',
      name: "Yuyan Lin",
      position: "Editor",
      classYear: "2026",
      memberYears: "4",
      imageSource: require('../assets/images/officers/yuyan.png'),
    },
    {
      id: '15',
      name: "Arjun Diwaker",
      position: "Editor",
      classYear: "2027",
      memberYears: "2",
      imageSource: require('../assets/images/officers/arjun.png'),
    },
    {
      id: '16',
      name: "Gabriella Hodgson",
      position: "Publicity",
      classYear: "2026",
      memberYears: "3",
      imageSource: require('../assets/images/officers/gabriella.png'),
    },
    {
      id: '17',
      name: "Winston Si",
      position: "Publicity",
      classYear: "2028",
      memberYears: "2",
      imageSource: require('../assets/images/officers/winston.png'),
    },
    {
      id: '18',
      name: "Ruhi Gore",
      position: "Hours Manager",
      classYear: "2026",
      memberYears: "4",
      imageSource: require('../assets/images/officers/ruhi.png'),
    },
    {
      id: '19',
      name: "Dhruv Mantri",
      position: "Hours Manager",
      classYear: "2027",
      memberYears: "2",
      imageSource: require('../assets/images/officers/dhruv.png'),
    },
    {
      id: '20',
      name: "Jefferson Tran",
      position: "Hours Manager",
      classYear: "2026",
      memberYears: "3",
      imageSource: require('../assets/images/officers/jefferson.png'),
    },
    {
      id: '21',
      name: "Anabella Vo",
      position: "Communications",
      classYear: "2026",
      memberYears: "3",
      imageSource: require('../assets/images/officers/anabella.png'),
    },
    {
      id: '22',
      name: "Gabriela Carlos",
      position: "Communications",
      classYear: "2027",
      memberYears: "2",
      imageSource: require('../assets/images/officers/gabriela.png'),
    },
  ];

  const renderOfficerCard = ({ item, index }) => (
    <AnimatedOfficerCard
      item={item}
      index={index}
      cardWidth={cardWidth}
      cardHeight={cardHeight}
      numColumns={numColumns}
      isWeb={isWeb}
      isMobile={isMobile}
    />
  );



  // Use ScrollView with flexWrap for web, FlatList for mobile
  if (isWeb) {
    return (
      <SafeAreaView style={[styles.container, Platform.OS === 'web' && { flex: 1, minHeight: '100vh' }]}>
        <StatusBar barStyle="light-content" backgroundColor="#0d1b2a" />
        
        {/* Floating Sparkles Background */}
        <FloatingSparkles />
        
        {/* Header */}
        <Animated.View 
          style={[
            styles.header,
            { transform: [{ translateY: headerAnim }] }
          ]}
        >
          <View style={styles.headerContent}>
            <TouchableOpacity 
              style={styles.backButton}
              onPress={() => navigation.goBack()}
            >
              <Ionicons name="arrow-back" size={24} color="#4299e1" />
            </TouchableOpacity>
            
            <View style={styles.headerTitleContainer}>
              <Animated.Text 
                style={[
                  styles.headerTitle,
                  { opacity: titleAnim }
                ]}
              >
                Meet Our Officers
              </Animated.Text>
              <Animated.Text 
                style={[
                  styles.headerSubtitle,
                  { opacity: titleAnim }
                ]}
              >
                The dedicated leaders of Cypress Ranch Key Club
              </Animated.Text>
            </View>
            
            <View style={styles.headerSpacer} />
          </View>
        </Animated.View>

        <ScrollView 
          style={Platform.OS === 'web' ? { flex: 1 } : undefined}
          contentContainerStyle={Platform.OS === 'web' ? [styles.webContainer, { padding: 20, justifyContent: 'flex-start' }] : [styles.webContainer, { padding: 20 }]}
          showsVerticalScrollIndicator={false}
        >
          <View style={[styles.webGrid, { maxWidth: 1400, alignSelf: 'center' }]}>
            {officers.map((item, index) => 
              <View key={item.id} style={{ marginBottom: 25 }}>
                <AnimatedOfficerCard
                  item={item}
                  index={index}
                  cardWidth={cardWidth}
                  cardHeight={cardHeight}
                  numColumns={numColumns}
                  isWeb={isWeb}
                  isMobile={isMobile}
                />
              </View>
            )}
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // Mobile/Tablet layout with FlatList
  return (
    <SafeAreaView style={[styles.container, Platform.OS === 'web' && { flex: 1, minHeight: '100vh' }]}>
      <StatusBar barStyle="light-content" backgroundColor="#0d1b2a" />
      
      {/* Header */}
      <Animated.View 
        style={[
          styles.header,
          { transform: [{ translateY: headerAnim }] }
        ]}
      >
        <View style={styles.headerContent}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color="#4299e1" />
          </TouchableOpacity>
          
          <View style={styles.headerTitleContainer}>
            <Animated.Text 
              style={[
                styles.headerTitle,
                { opacity: titleAnim }
              ]}
            >
              Meet Our Officers
            </Animated.Text>
            <Animated.Text 
              style={[
                styles.headerSubtitle,
                { opacity: titleAnim }
              ]}
            >
              The dedicated leaders of Cypress Ranch Key Club
            </Animated.Text>
          </View>
          
          <View style={styles.headerSpacer} />
        </View>
      </Animated.View>

      <FlatList
        data={officers}
        renderItem={renderOfficerCard}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContainer}
        numColumns={numColumns}
        key={numColumns} // Force re-render when columns change
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a365d', // Deep navy blue background
  },
  header: {
    backgroundColor: 'rgba(66, 153, 225, 0.1)', // Professional blue with transparency
    borderBottomWidth: 1,
    borderBottomColor: '#4299e1',
    paddingVertical: 15,
    paddingHorizontal: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 8,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(66, 153, 225, 0.2)',
  },
  headerTitleContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#4299e1', // Professional blue
    textShadowColor: 'rgba(66, 153, 225, 0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
    textAlign: 'center',
  },
  headerSpacer: {
    width: 40,
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 20,
  },
  listContainer: {
    paddingHorizontal: 10,
    paddingVertical: 10,
    paddingBottom: 30,
  },
  webContainer: {
    flexGrow: 1,
    minHeight: screenHeight + 100,
  },
  webGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-evenly',
    width: '100%',
  },
  cardContainer: {
    marginBottom: 20,
  },
  officerCard: {
    margin: 8,
    borderRadius: 16,
    overflow: 'visible',
    shadowColor: '#4299e1',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.5,
    shadowRadius: 25,
    elevation: 20,
    borderWidth: 2,
    borderColor: 'rgba(66, 153, 225, 0.4)',
    backgroundColor: '#2d3748',
  },
  keyClubLogo: {
    position: 'absolute',
    top: 10,
    left: 10,
    width: 30,
    height: 30,
    opacity: 0.8,
    zIndex: 10,
  },
  cardBackground: {
    width: '100%',
    height: '100%',
    padding: 10,
    alignItems: 'center',
    backgroundColor: '#2d3748',
  },
  photoContainer: {
    marginBottom: 15,
    borderRadius: 15,
    overflow: 'visible',
    borderWidth: 4,
    borderColor: '#fff',
  },
  officerImage: {
    width: '100%',
    height: '100%',
  },
  nameContainer: {
    marginBottom: 8,
    paddingHorizontal: 5,
  },
  officerName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#4299e1', // Professional blue
    textAlign: 'center',
    marginBottom: 4,
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  officerPosition: {
    fontSize: 14,
    color: '#e2e8f0', // Light gray
    textAlign: 'center',
    opacity: 0.9,
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  detailsContainer: {
    alignItems: 'center',
    marginTop: 5,
  },
  classInfo: {
    color: '#e2e8f0', // Light gray
    textAlign: 'center',
  },
  memberInfo: {
    color: '#e2e8f0', // Light gray
    textAlign: 'center',
    marginBottom: 15,
  },
  floralBorder: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 80,
    width: '100%',
  },
  positionContainer: {
    position: 'absolute',
    bottom: 25,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 5,
  },
  positionText: {
    backgroundColor: '#4299e1', // Professional blue
    color: '#ffffff',
    fontWeight: 'bold',
    paddingVertical: 8,
    paddingHorizontal: 20,
    borderRadius: 20,
    overflow: 'visible',
    textAlign: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    borderWidth: 1,
    borderColor: 'rgba(66, 153, 225, 0.3)',
  },
  positionGlow: {
    position: 'absolute',
    top: -10,
    left: -10,
    right: -10,
    bottom: -10,
    backgroundColor: '#4299e1', // Professional blue
    borderRadius: 25,
    opacity: 0.2,
  },
  positionSparkle: {
    position: 'absolute',
    top: -8,
    right: -8,
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardTouchable: {
    flex: 1,
  },
  cardImage: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  cardImageStyle: {
    borderRadius: 14,
  },
  cardOverlay: {
    backgroundColor: 'rgba(26, 54, 93, 0.8)', // Deep navy blue with transparency
    padding: 16,
  },
  cardContent: {
    alignItems: 'center',
  },
  floatingSparkle: {
    position: 'absolute',
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: '#4299e1', // Professional blue
    shadowColor: '#4299e1',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 4,
    elevation: 3,
    zIndex: 1,
  },
});