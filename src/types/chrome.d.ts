// Chrome API 类型定义

declare namespace chrome {
  export namespace history {
    interface HistoryItem {
      id: string;
      url?: string;
      title?: string;
      lastVisitTime?: number;
      visitCount?: number;
      typedCount?: number;
    }

    interface VisitItem {
      id: string;
      visitId: string;
      visitTime?: number;
      referringVisitId: string;
      transition: string;
    }

    interface GetVisitsDetails {
      url: string;
    }

    interface SearchQuery {
      text: string;
      startTime?: number;
      endTime?: number;
      maxResults?: number;
    }

    function search(query: SearchQuery): Promise<HistoryItem[]>;
    function getVisits(details: GetVisitsDetails): Promise<VisitItem[]>;
    function deleteUrl(details: { url: string }): Promise<void>;
    function deleteRange(range: { startTime: number; endTime: number }): Promise<void>;
    function deleteAll(): Promise<void>;
  }

  export namespace runtime {
    interface MessageSender {
      id?: string;
      tab?: chrome.tabs.Tab;
      frameId?: number;
      url?: string;
      origin?: string;
    }

    interface Port {
      name: string;
      disconnect(): void;
      onDisconnect: events.Event<(port: Port) => void>;
      onMessage: events.Event<(message: any, port: Port) => void>;
      postMessage: (message: any) => void;
    }

    function sendMessage<T = any>(message: any): Promise<T>;
    function connect(connectInfo?: { name?: string }): Port;
  }

  export namespace tabs {
    interface Tab {
      id?: number;
      index: number;
      windowId: number;
      url?: string;
      title?: string;
      active: boolean;
      pinned: boolean;
    }

    function query(queryInfo: { active: boolean; currentWindow: boolean }): Promise<Tab[]>;
    function create(createProperties: { url?: string; active?: boolean }): Promise<Tab>;
    function update(tabId: number, updateProperties: { url?: string; active?: boolean }): Promise<Tab>;
  }

  export namespace storage {
    interface StorageArea {
      get<T = any>(keys?: string | string[] | null): Promise<{ [key: string]: T }>;
      set(items: { [key: string]: any }): Promise<void>;
      remove(keys: string | string[]): Promise<void>;
      clear(): Promise<void>;
    }

    const sync: StorageArea;
    const local: StorageArea;
  }

  export namespace events {
    interface Event<T extends Function> {
      addListener(callback: T): void;
      removeListener(callback: T): void;
      hasListener(callback: T): boolean;
    }
  }
}