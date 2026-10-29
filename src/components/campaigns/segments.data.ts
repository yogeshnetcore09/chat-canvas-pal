// Mock rows for the Audience → Segments table. Shape mirrors the Segments
// listing: identity (name + numeric id) plus the reach counts per channel.

export interface Segment {
  id: number;
  name: string;
  createdOn: string;
  refreshedOn: string;
  userCount: number;
  email: number;
  sms: number;
  appPush: number;
  webPush: number;
  /** Built by the co-marketer rather than hand-rolled — badged as AI in the list. */
  aiGenerated?: boolean;
}

export const segments: Segment[] = [
  {
    id: 635,
    name: "Before-enable flexible funnel — Pro plan prospects",
    createdOn: "Aug 13, 2026 12:24 PM",
    refreshedOn: "Aug 13, 2026 12:24 PM",
    userCount: 206258,
    email: 201218,
    sms: 205905,
    appPush: 0,
    webPush: 6,
  },
  {
    id: 634,
    name: "Before-enable flexible funnel — Pro trial expiring soon",
    createdOn: "Aug 13, 2026 12:22 PM",
    refreshedOn: "Aug 13, 2026 12:22 PM",
    userCount: 61,
    email: 48,
    sms: 2,
    appPush: 0,
    webPush: 8,
  },
  {
    id: 633,
    name: "lswebapp eks_1_Sent_Dropped",
    createdOn: "Aug 11, 2026 12:16 PM",
    refreshedOn: "Aug 13, 2026 01:39 AM",
    userCount: 51,
    email: 48,
    sms: 1,
    appPush: 0,
    webPush: 1,
  },
  {
    id: 632,
    name: "funn_api_Clicked_Dropped",
    createdOn: "Aug 09, 2026 11:38 PM",
    refreshedOn: "Aug 09, 2026 11:38 PM",
    userCount: 543,
    email: 516,
    sms: 543,
    appPush: 0,
    webPush: 0,
  },
  {
    id: 631,
    name: "funn_api_Open/Read_Dropped_0",
    createdOn: "Aug 09, 2026 11:27 PM",
    refreshedOn: "Aug 13, 2026 01:39 AM",
    userCount: 206191,
    email: 201116,
    sms: 205915,
    appPush: 0,
    webPush: 7,
  },
  {
    id: 630,
    name: "High-Intent Re-Engagers",
    createdOn: "Aug 08, 2026 04:12 PM",
    refreshedOn: "Aug 13, 2026 01:39 AM",
    userCount: 12133,
    email: 11842,
    sms: 9017,
    appPush: 4260,
    webPush: 312,
  },
  {
    id: 629,
    name: "Gmail engaged — last 30 days",
    createdOn: "Aug 07, 2026 09:48 AM",
    refreshedOn: "Aug 12, 2026 11:02 PM",
    userCount: 88420,
    email: 88420,
    sms: 41205,
    appPush: 12660,
    webPush: 148,
  },
  {
    id: 628,
    name: "Dormant subscribers_6m",
    createdOn: "Aug 05, 2026 06:31 PM",
    refreshedOn: "Aug 12, 2026 11:02 PM",
    userCount: 154902,
    email: 151338,
    sms: 98771,
    appPush: 0,
    webPush: 22,
  },
];

/** A segment built from a SQL query on the customer's data warehouse. */
export interface WarehouseSegment {
  id: number;
  name: string;
  createdOn: string;
  refreshedOn: string;
  userCount: number;
}

export const warehouseSegments: WarehouseSegment[] = [
  {
    id: 912,
    name: "Renewals due in 90 days — high engagement",
    createdOn: "Aug 12, 2026 10:05 AM",
    refreshedOn: "Aug 13, 2026 01:39 AM",
    userCount: 4812,
  },
  {
    id: 911,
    name: "Lapsed enterprise accounts — no login in 30 days",
    createdOn: "Aug 10, 2026 04:47 PM",
    refreshedOn: "Aug 13, 2026 01:39 AM",
    userCount: 1376,
  },
  {
    id: 910,
    name: "High LTV customers — top 10% by revenue",
    createdOn: "Aug 06, 2026 11:20 AM",
    refreshedOn: "Aug 12, 2026 01:39 AM",
    userCount: 23540,
  },
];
