// Type definitions for Google API libraries

interface Window {
  gapi: {
    load: (api: string, callback: { callback: () => void } | (() => void)) => void;
    client: {
      init: (config: { apiKey?: string; discoveryDocs: string[] }) => Promise<void>;
    };
  };
  google: {
    picker: {
      View: new (viewId: any) => any;
      ViewId: { DOCS: any };
      PickerBuilder: new () => any;
      Feature: { NAV_HIDDEN: any; MULTISELECT_ENABLED: any };
      Action: { PICKED: string };
    };
  };
} 