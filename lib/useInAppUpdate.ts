import { useEffect } from 'react';
import { Alert, Platform } from 'react-native';
import SpInAppUpdates, { IAUUpdateKind } from 'sp-react-native-in-app-updates';

const inAppUpdates = new SpInAppUpdates(false);

export function useInAppUpdate() {
  useEffect(() => {
    if (Platform.OS !== 'android' || __DEV__) return;
    runUpdateCheck();
  }, []);
}

async function runUpdateCheck() {
  try {
    const result = await inAppUpdates.checkNeedsUpdate();
    if (!result.shouldUpdate) return;

    // updatePriority 5 = critical (set in Play Console) → immediate flow
    // Play takes over the UI and blocks the app until updated
    const isCritical = (result.updatePriority ?? 0) >= 5;

    if (isCritical) {
      inAppUpdates.startUpdate({ updateType: IAUUpdateKind.IMMEDIATE });
      return;
    }

    Alert.alert(
      'Update available',
      'A new version of Duka Vendors is ready with improvements and bug fixes. Update now for the best experience.',
      [
        { text: 'Later', style: 'cancel' },
        { text: 'Update now', onPress: () => inAppUpdates.startUpdate({ updateType: IAUUpdateKind.FLEXIBLE }) },
      ],
      { cancelable: true }
    );
  } catch {
    // Silently ignore — update checks should never crash the app
  }
}
