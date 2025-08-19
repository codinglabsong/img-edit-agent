export interface Message {
  id: string;
  content: string;
  sender: "user" | "agent";
  timestamp: Date;
}

export interface ImageItem {
  id: string;
  url: string | null;
  title: string;
  description: string;
  timestamp: Date;
  type: "uploaded" | "generated" | "sample";
}
