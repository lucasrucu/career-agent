/* eslint-disable jsx-a11y/alt-text */
// ATS-friendly resume PDF (FR-9, PRD §12). Single column, light, built-in
// Helvetica (no embedded fonts → parser-safe), no tables/columns/graphics.
// This document IS the deliverable resume — the dashboard's amber theme is for
// the app UI only.

import React from "react";
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
} from "@react-pdf/renderer";

import type { Profile } from "@/lib/types";

const styles = StyleSheet.create({
  page: {
    paddingTop: 40,
    paddingBottom: 40,
    paddingHorizontal: 48,
    fontFamily: "Helvetica",
    fontSize: 10,
    color: "#1a1a1a",
    lineHeight: 1.4,
  },
  name: { fontSize: 20, fontFamily: "Helvetica-Bold", marginBottom: 2 },
  contact: { fontSize: 9, color: "#444", marginBottom: 2 },
  sectionTitle: {
    fontSize: 11,
    fontFamily: "Helvetica-Bold",
    marginTop: 14,
    marginBottom: 4,
    borderBottom: "1 solid #cccccc",
    paddingBottom: 2,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  summary: { marginBottom: 2 },
  entry: { marginBottom: 8 },
  entryHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  entryTitle: { fontFamily: "Helvetica-Bold", fontSize: 10.5 },
  entrySub: { fontSize: 9.5, color: "#333" },
  entryDates: { fontSize: 9, color: "#666" },
  bullet: { flexDirection: "row", marginTop: 2 },
  bulletDot: { width: 10, fontSize: 10 },
  bulletText: { flex: 1 },
  skillsLine: { marginBottom: 2 },
  interestTitle: { fontFamily: "Helvetica-Bold" },
  interestSignal: { color: "#666" },
});

function ContactLine({ profile }: { profile: Profile }) {
  const c = profile.contact;
  const parts = [c.email, c.phone, c.location, ...(c.links ?? [])].filter(
    Boolean
  );
  if (!parts.length) return null;
  return <Text style={styles.contact}>{parts.join("  •  ")}</Text>;
}

export function ResumeDocument({ profile }: { profile: Profile }) {
  return (
    <Document
      title={`${profile.contact.name} — Resume`}
      author={profile.contact.name}
    >
      <Page size="LETTER" style={styles.page}>
        <Text style={styles.name}>{profile.contact.name}</Text>
        <ContactLine profile={profile} />

        {profile.summary ? (
          <>
            <Text style={styles.sectionTitle}>Summary</Text>
            <Text style={styles.summary}>{profile.summary}</Text>
          </>
        ) : null}

        {profile.experiences?.length ? (
          <>
            <Text style={styles.sectionTitle}>Experience</Text>
            {profile.experiences.map((exp, i) => (
              <View key={i} style={styles.entry} wrap={false}>
                <View style={styles.entryHeader}>
                  <Text style={styles.entryTitle}>
                    {exp.title}
                    {exp.company ? `, ${exp.company}` : ""}
                  </Text>
                  <Text style={styles.entryDates}>{exp.dates}</Text>
                </View>
                {exp.bullets?.map((b, j) => (
                  <View key={j} style={styles.bullet}>
                    <Text style={styles.bulletDot}>•</Text>
                    <Text style={styles.bulletText}>{b}</Text>
                  </View>
                ))}
              </View>
            ))}
          </>
        ) : null}

        {profile.education?.length ? (
          <>
            <Text style={styles.sectionTitle}>Education</Text>
            {profile.education.map((ed, i) => (
              <View key={i} style={styles.entry} wrap={false}>
                <View style={styles.entryHeader}>
                  <Text style={styles.entryTitle}>{ed.institution}</Text>
                  {ed.dates ? (
                    <Text style={styles.entryDates}>{ed.dates}</Text>
                  ) : null}
                </View>
                <Text style={styles.entrySub}>{ed.credential}</Text>
              </View>
            ))}
          </>
        ) : null}

        {profile.skills?.length ? (
          <>
            <Text style={styles.sectionTitle}>Skills</Text>
            <Text style={styles.skillsLine}>
              {profile.skills.map((s) => s.name).join("  •  ")}
            </Text>
          </>
        ) : null}

        {profile.certifications?.length ? (
          <>
            <Text style={styles.sectionTitle}>Certifications</Text>
            {profile.certifications.map((cert, i) => (
              <Text key={i} style={styles.skillsLine}>
                {cert.name}
                {cert.issuer ? `, ${cert.issuer}` : ""}
                {cert.year ? ` (${cert.year})` : ""}
              </Text>
            ))}
          </>
        ) : null}

        {profile.interests?.length ? (
          <>
            <Text style={styles.sectionTitle}>Interests &amp; Achievements</Text>
            {profile.interests.map((it, i) => (
              <Text key={i} style={styles.skillsLine}>
                <Text style={styles.interestTitle}>{it.title}</Text>
                {it.detail ? ` — ${it.detail}` : ""}
                {it.signal ? (
                  <Text style={styles.interestSignal}> ({it.signal})</Text>
                ) : null}
              </Text>
            ))}
          </>
        ) : null}
      </Page>
    </Document>
  );
}
