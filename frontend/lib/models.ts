export type EmergencyContact = {
  id: string;
  userId: string;
  name: string;
  phoneNumber: string;
  relationship: string;
};

export type EmergencyReport = {
  id: string;
  userId: string;
  latitude: number | null;
  longitude: number | null;
  emergencyType: string;
  channel: "sos_multi_channel" | string;
  createdAt: string;
};