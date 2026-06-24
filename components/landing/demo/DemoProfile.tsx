"use client";

import { Mail, MapPin, Phone, Link2, Sparkles } from "lucide-react";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DEMO_PROFILE } from "@/components/landing/demo/sampleData";

export function DemoProfile() {
  const { contact, summary, experiences, skills, interests } = DEMO_PROFILE;

  return (
    <div className="space-y-4">
      {/* Header / contact */}
      <Card className="bg-card">
        <CardContent className="space-y-2">
          <h3 className="font-heading text-xl font-semibold">{contact.name}</h3>
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
            {contact.location ? (
              <span className="flex items-center gap-1.5">
                <MapPin className="size-3.5" /> {contact.location}
              </span>
            ) : null}
            {contact.email ? (
              <span className="flex items-center gap-1.5">
                <Mail className="size-3.5" /> {contact.email}
              </span>
            ) : null}
            {contact.phone ? (
              <span className="flex items-center gap-1.5">
                <Phone className="size-3.5" /> {contact.phone}
              </span>
            ) : null}
            {contact.links?.map((link) => (
              <span key={link} className="flex items-center gap-1.5">
                <Link2 className="size-3.5" /> {link}
              </span>
            ))}
          </div>
          <p className="pt-1 text-sm leading-relaxed text-foreground">{summary}</p>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Experience */}
        <Card className="bg-card">
          <CardHeader>
            <CardTitle className="text-base">Experience</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {experiences.map((exp) => (
              <div key={`${exp.company}-${exp.title}`} className="space-y-1.5">
                <div className="flex items-baseline justify-between gap-2">
                  <p className="font-medium">{exp.title}</p>
                  <span className="shrink-0 text-xs text-muted-foreground">{exp.dates}</span>
                </div>
                <p className="text-sm text-muted-foreground">{exp.company}</p>
                <ul className="list-disc space-y-1 pl-4 text-sm text-muted-foreground">
                  {exp.bullets.map((b) => (
                    <li key={b}>{b}</li>
                  ))}
                </ul>
              </div>
            ))}
          </CardContent>
        </Card>

        <div className="space-y-4">
          {/* Skills */}
          <Card className="bg-card">
            <CardHeader>
              <CardTitle className="text-base">Skills</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {skills.map((skill) => (
                  <Badge key={skill.name} variant="secondary" className="gap-1.5">
                    {skill.name}
                    <span className="text-[0.65rem] text-muted-foreground">{skill.level}</span>
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Interests & Achievements — the new feature, front and center */}
          <Card className="border border-primary/30 bg-primary/5">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Sparkles className="size-4 text-primary" />
                Interests &amp; Achievements
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {interests?.map((interest) => (
                <div key={interest.title} className="space-y-1">
                  <p className="font-medium">{interest.title}</p>
                  {interest.detail ? (
                    <p className="text-sm text-muted-foreground">{interest.detail}</p>
                  ) : null}
                  {interest.signal ? (
                    <p className="text-xs text-primary">
                      Signals: <span className="text-foreground/80">{interest.signal}</span>
                    </p>
                  ) : null}
                </div>
              ))}
              <p className="pt-1 text-xs text-muted-foreground">
                Career Agent reads what you do outside work and turns it into evidence of the soft
                skills recruiters look for.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
