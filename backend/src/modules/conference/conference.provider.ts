// Kontrak provider konferensi. Keputusan Tahap 5: Jitsi Meet (gratis, embed
// iframe) sebagai default; Zoom/Meet dapat disuntik belakangan bila PKS
// mengharuskan — tanpa mengubah kontrak. Fake untuk dev/test.
export interface JoinMaterial {
  // Untuk embed: nama ruang + domain; frontend merender iframe Jitsi.
  // URL mentah TIDAK dibagikan sebagai alur normal (PRD §4.3).
  roomName: string;
  domain: string;
  displayName: string;
}

export interface ConferenceProvider {
  readonly providerName: string;
  createRoom(lessonId: string, title: string): Promise<{ roomReference: string }>;
  getJoinMaterial(
    roomReference: string,
    displayName: string,
  ): Promise<JoinMaterial>;
}
