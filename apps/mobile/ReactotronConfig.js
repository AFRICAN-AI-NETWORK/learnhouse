import { Platform } from "react-native";

if (__DEV__ && Platform.OS !== "web") {
  const Reactotron = require("reactotron-react-native").default;
  const AsyncStorage =
    require("@react-native-async-storage/async-storage").default;

  Reactotron.setAsyncStorageHandler(AsyncStorage)
    .configure({
      name: "LearnHouse Mobile",
    })
    .useReactNative({
      asyncStorage: false,
      networking: {
        ignoreUrls: /symbolicate/,
      },
      editor: false,
      errors: { veto: (frame) => false },
      overlay: false,
    })
    .connect();

  console.tron = Reactotron;
} else if (__DEV__) {
  console.tron = console;
}
