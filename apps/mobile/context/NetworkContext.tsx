import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useRef,
} from "react";
import { View, Text, StyleSheet, Animated, Platform } from "react-native";
import * as Network from "expo-network";
import { useSafeAreaInsets } from "react-native-safe-area-context";

interface NetworkContextType {
  isConnected: boolean;
}

const NetworkContext = createContext<NetworkContextType>({ isConnected: true });

export const useNetwork = () => useContext(NetworkContext);

export const NetworkProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [isConnected, setIsConnected] = useState<boolean>(true);
  const slideAnim = useRef(new Animated.Value(-100)).current;
  const insets = useSafeAreaInsets();

  useEffect(() => {
    let isMounted = true;
    let interval: NodeJS.Timeout | null = null;

    const handleConnectionChange = (connected: boolean) => {
      if (!isMounted) return;
      setIsConnected(connected);

      if (!connected) {
        Animated.spring(slideAnim, {
          toValue: 0,
          useNativeDriver: true,
          speed: 12,
          bounciness: 4,
        }).start();
      } else {
        Animated.timing(slideAnim, {
          toValue: -100,
          duration: 300,
          useNativeDriver: true,
        }).start();
      }
    };

    if (Platform.OS === "web") {
      const handleOnline = () => handleConnectionChange(true);
      const handleOffline = () => handleConnectionChange(false);
      window.addEventListener("online", handleOnline);
      window.addEventListener("offline", handleOffline);

      return () => {
        isMounted = false;
        window.removeEventListener("online", handleOnline);
        window.removeEventListener("offline", handleOffline);
      };
    } else {
      interval = setInterval(async () => {
        try {
          const state = await Network.getNetworkStateAsync();
          handleConnectionChange(state.isConnected ?? true);
        } catch (e) {
          // Ignore
        }
      }, 3000);

      return () => {
        isMounted = false;
        if (interval) clearInterval(interval);
      };
    }
  }, [slideAnim]);

  return (
    <NetworkContext.Provider value={{ isConnected }}>
      {children}
      <Animated.View
        style={[
          styles.banner,
          {
            paddingTop: Math.max(insets.top, 20),
            transform: [{ translateY: slideAnim }],
          },
        ]}
      >
        <Text style={styles.bannerText}>
          No Internet Connection. Please check your network.
        </Text>
      </Animated.View>
    </NetworkContext.Provider>
  );
};

const styles = StyleSheet.create({
  banner: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: "#EF4444", // Red-500
    paddingBottom: 12,
    paddingHorizontal: 20,
    zIndex: 9999,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "flex-end",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 5,
  },
  bannerText: {
    color: "#FFFFFF",
    fontWeight: "600",
    fontSize: 14,
    textAlign: "center",
  },
});
