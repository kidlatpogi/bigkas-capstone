import { zzfx } from 'zzfx';
import { Haptics, ImpactStyle } from '@capacitor/haptics';

export function useInteraction() {
  const playClick = async () => {
    zzfx(...[,,900,.01,.06,.05,,1.5,,,,,,50,,,.01]);
    await Haptics.impact({ style: ImpactStyle.Light }).catch(() => {});
  };

  return { playClick };
}

