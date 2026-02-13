import NetInfo from "@react-native-community/netinfo";
import type { SyncNetworkAdapter } from "@cookednote/shared/lib/sync-adapter";

export class MobileSyncNetwork implements SyncNetworkAdapter {
  private _isOnline = true;

  constructor() {
    // Sync initial state
    NetInfo.fetch().then((state) => {
      this._isOnline = state.isConnected ?? true;
    });
  }

  isOnline(): boolean {
    return this._isOnline;
  }

  onOnlineChange(callback: (online: boolean) => void): () => void {
    return NetInfo.addEventListener((state) => {
      const online = state.isConnected ?? true;
      this._isOnline = online;
      callback(online);
    });
  }
}
