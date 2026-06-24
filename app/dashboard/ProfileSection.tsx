"use client";

import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Download,
  FileUp,
  Loader2,
  Plus,
  Save,
  Trash2,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  exportResumePdf,
  getProfile,
  parseResume,
  saveProfile,
} from "@/lib/api-client";
import type {
  Certification,
  Education,
  Experience,
  Profile,
  Skill,
  SkillLevel,
} from "@/lib/types";

const SKILL_LEVELS: SkillLevel[] = [
  "beginner",
  "intermediate",
  "advanced",
  "expert",
];

function emptyProfile(): Profile {
  return {
    contact: { name: "", email: "", phone: "", location: "", links: [] },
    summary: "",
    experiences: [],
    education: [],
    skills: [],
    certifications: [],
  };
}

// Defensively normalize a possibly-partial Profile from the API into one that's
// safe to edit (arrays present, contact present).
function normalize(p: Profile | undefined | null): Profile {
  if (!p) return emptyProfile();
  return {
    contact: {
      name: p.contact?.name ?? "",
      email: p.contact?.email ?? "",
      phone: p.contact?.phone ?? "",
      location: p.contact?.location ?? "",
      links: p.contact?.links ?? [],
    },
    summary: p.summary ?? "",
    experiences: (p.experiences ?? []).map((e) => ({
      title: e.title ?? "",
      company: e.company ?? "",
      dates: e.dates ?? "",
      bullets: e.bullets ?? [],
    })),
    education: (p.education ?? []).map((e) => ({
      institution: e.institution ?? "",
      credential: e.credential ?? "",
      dates: e.dates ?? "",
    })),
    skills: (p.skills ?? []).map((s) => ({
      name: s.name ?? "",
      level: s.level ?? "intermediate",
    })),
    certifications: (p.certifications ?? []).map((c) => ({
      name: c.name ?? "",
      issuer: c.issuer ?? "",
      year: c.year ?? "",
    })),
  };
}

export function ProfileSection() {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [profile, setProfile] = useState<Profile>(emptyProfile());
  const [hydrated, setHydrated] = useState(false);

  const profileQuery = useQuery({
    queryKey: ["profile"],
    queryFn: getProfile,
  });

  // Hydrate the editable form once the GET resolves (first load only — don't
  // clobber the user's in-progress edits on refetch).
  useEffect(() => {
    if (!hydrated && profileQuery.isSuccess) {
      setProfile(normalize(profileQuery.data?.profile));
      setHydrated(true);
    }
  }, [hydrated, profileQuery.isSuccess, profileQuery.data]);

  const parseMutation = useMutation({
    mutationFn: parseResume,
    onMutate: () => {
      toast.loading("Parsing resume…", { id: "parse" });
    },
    onSuccess: (parsed) => {
      setProfile(normalize(parsed));
      setHydrated(true);
      toast.success("Resume parsed. Review and save below.", { id: "parse" });
    },
    onError: (err: Error) => {
      toast.error(err.message, { id: "parse" });
    },
  });

  const saveMutation = useMutation({
    mutationFn: (p: Profile) => saveProfile(p),
    onMutate: () => {
      toast.loading("Saving profile…", { id: "save" });
    },
    onSuccess: (record) => {
      queryClient.setQueryData(["profile"], record);
      queryClient.invalidateQueries({ queryKey: ["profile"] });
      toast.success(`Profile saved (v${record.version}).`, { id: "save" });
    },
    onError: (err: Error) => {
      toast.error(err.message, { id: "save" });
    },
  });

  const exportMutation = useMutation({
    mutationFn: () =>
      exportResumePdf({
        content: profile,
        filename: profile.contact.name
          ? `${profile.contact.name.split(" ").pop()}_Resume.pdf`
          : "resume.pdf",
      }),
    onMutate: () => {
      toast.loading("Generating PDF…", { id: "export-base" });
    },
    onSuccess: () => {
      toast.success("PDF downloaded.", { id: "export-base" });
    },
    onError: (err: Error) => {
      toast.error(err.message, { id: "export-base" });
    },
  });

  function onPickFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow re-selecting the same file
    if (!file) return;
    const ok = /\.(pdf|docx)$/i.test(file.name);
    if (!ok) {
      toast.error("Only PDF and DOCX files are supported.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("File is larger than 5 MB.");
      return;
    }
    parseMutation.mutate(file);
  }

  // --- field helpers --------------------------------------------------------

  function setContact<K extends keyof Profile["contact"]>(
    key: K,
    value: Profile["contact"][K]
  ) {
    setProfile((p) => ({ ...p, contact: { ...p.contact, [key]: value } }));
  }

  function setLinks(value: string) {
    const links = value
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    setProfile((p) => ({ ...p, contact: { ...p.contact, links } }));
  }

  function updateExperience(i: number, patch: Partial<Experience>) {
    setProfile((p) => {
      const experiences = [...p.experiences];
      experiences[i] = { ...experiences[i], ...patch };
      return { ...p, experiences };
    });
  }

  function updateEducation(i: number, patch: Partial<Education>) {
    setProfile((p) => {
      const education = [...p.education];
      education[i] = { ...education[i], ...patch };
      return { ...p, education };
    });
  }

  function updateSkill(i: number, patch: Partial<Skill>) {
    setProfile((p) => {
      const skills = [...p.skills];
      skills[i] = { ...skills[i], ...patch };
      return { ...p, skills };
    });
  }

  function updateCert(i: number, patch: Partial<Certification>) {
    setProfile((p) => {
      const certifications = [...p.certifications];
      certifications[i] = { ...certifications[i], ...patch };
      return { ...p, certifications };
    });
  }

  function removeAt<K extends "experiences" | "education" | "skills" | "certifications">(
    key: K,
    i: number
  ) {
    setProfile((p) => ({
      ...p,
      [key]: (p[key] as unknown[]).filter((_, idx) => idx !== i),
    }));
  }

  const loading = profileQuery.isLoading;
  const busy = parseMutation.isPending;

  return (
    <div className="flex flex-col gap-6">
      {/* Upload */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileUp className="size-4 text-primary" /> Upload resume
          </CardTitle>
          <CardDescription>
            PDF or DOCX, up to 5 MB. We parse it into the form below for you to
            review — nothing saves until you hit Save.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            className="hidden"
            onChange={onPickFile}
          />
          <Button
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
            disabled={busy}
          >
            {busy ? (
              <>
                <Loader2 className="size-4 animate-spin" /> Parsing…
              </>
            ) : (
              <>
                <FileUp className="size-4" /> Choose file
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {loading ? (
        <div className="flex items-center justify-center py-12 text-muted-foreground">
          <Loader2 className="size-6 animate-spin" />
        </div>
      ) : (
        <>
          {/* Contact */}
          <Card>
            <CardHeader>
              <CardTitle>Contact</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <Field label="Name">
                <Input
                  value={profile.contact.name}
                  onChange={(e) => setContact("name", e.target.value)}
                  placeholder="Ada Lovelace"
                />
              </Field>
              <Field label="Email">
                <Input
                  type="email"
                  value={profile.contact.email ?? ""}
                  onChange={(e) => setContact("email", e.target.value)}
                  placeholder="ada@example.com"
                />
              </Field>
              <Field label="Phone">
                <Input
                  value={profile.contact.phone ?? ""}
                  onChange={(e) => setContact("phone", e.target.value)}
                  placeholder="+1 555 000 0000"
                />
              </Field>
              <Field label="Location">
                <Input
                  value={profile.contact.location ?? ""}
                  onChange={(e) => setContact("location", e.target.value)}
                  placeholder="Remote · US"
                />
              </Field>
              <Field label="Links (comma-separated)" className="sm:col-span-2">
                <Input
                  value={(profile.contact.links ?? []).join(", ")}
                  onChange={(e) => setLinks(e.target.value)}
                  placeholder="linkedin.com/in/…, github.com/…"
                />
              </Field>
            </CardContent>
          </Card>

          {/* Summary */}
          <Card>
            <CardHeader>
              <CardTitle>Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                value={profile.summary}
                onChange={(e) =>
                  setProfile((p) => ({ ...p, summary: e.target.value }))
                }
                rows={4}
                placeholder="A few sentences on who you are and what you do."
              />
            </CardContent>
          </Card>

          {/* Experiences */}
          <Card>
            <CardHeader>
              <CardTitle>Experience</CardTitle>
              <CardDescription>
                Roles, with accomplishment bullets (one per line).
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              {profile.experiences.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No experience yet.
                </p>
              ) : null}
              {profile.experiences.map((exp, i) => (
                <div
                  key={i}
                  className="flex flex-col gap-3 rounded-lg border border-border p-3"
                >
                  <div className="grid gap-3 sm:grid-cols-3">
                    <Input
                      value={exp.title}
                      onChange={(e) =>
                        updateExperience(i, { title: e.target.value })
                      }
                      placeholder="Title"
                    />
                    <Input
                      value={exp.company}
                      onChange={(e) =>
                        updateExperience(i, { company: e.target.value })
                      }
                      placeholder="Company"
                    />
                    <Input
                      value={exp.dates}
                      onChange={(e) =>
                        updateExperience(i, { dates: e.target.value })
                      }
                      placeholder="2021 – Present"
                    />
                  </div>
                  <Textarea
                    value={exp.bullets.join("\n")}
                    onChange={(e) =>
                      updateExperience(i, {
                        bullets: e.target.value.split("\n"),
                      })
                    }
                    rows={3}
                    placeholder="• Led…&#10;• Built…"
                  />
                  <div className="flex justify-end">
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => removeAt("experiences", i)}
                    >
                      <Trash2 className="size-3.5" /> Remove
                    </Button>
                  </div>
                </div>
              ))}
              <div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setProfile((p) => ({
                      ...p,
                      experiences: [
                        ...p.experiences,
                        { title: "", company: "", dates: "", bullets: [] },
                      ],
                    }))
                  }
                >
                  <Plus className="size-3.5" /> Add experience
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Education */}
          <Card>
            <CardHeader>
              <CardTitle>Education</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              {profile.education.length === 0 ? (
                <p className="text-sm text-muted-foreground">No education yet.</p>
              ) : null}
              {profile.education.map((edu, i) => (
                <div
                  key={i}
                  className="grid items-end gap-3 rounded-lg border border-border p-3 sm:grid-cols-[1fr_1fr_auto]"
                >
                  <Input
                    value={edu.institution}
                    onChange={(e) =>
                      updateEducation(i, { institution: e.target.value })
                    }
                    placeholder="Institution"
                  />
                  <Input
                    value={edu.credential}
                    onChange={(e) =>
                      updateEducation(i, { credential: e.target.value })
                    }
                    placeholder="Degree / credential"
                  />
                  <div className="flex gap-2">
                    <Input
                      value={edu.dates ?? ""}
                      onChange={(e) =>
                        updateEducation(i, { dates: e.target.value })
                      }
                      placeholder="Year"
                    />
                    <Button
                      variant="destructive"
                      size="icon-sm"
                      onClick={() => removeAt("education", i)}
                      aria-label="Remove education"
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
              <div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setProfile((p) => ({
                      ...p,
                      education: [
                        ...p.education,
                        { institution: "", credential: "", dates: "" },
                      ],
                    }))
                  }
                >
                  <Plus className="size-3.5" /> Add education
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Skills */}
          <Card>
            <CardHeader>
              <CardTitle>Skills</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              {profile.skills.length === 0 ? (
                <p className="text-sm text-muted-foreground">No skills yet.</p>
              ) : null}
              {profile.skills.map((skill, i) => (
                <div
                  key={i}
                  className="grid items-center gap-3 sm:grid-cols-[1fr_10rem_auto]"
                >
                  <Input
                    value={skill.name}
                    onChange={(e) => updateSkill(i, { name: e.target.value })}
                    placeholder="Skill"
                  />
                  <select
                    value={skill.level}
                    onChange={(e) =>
                      updateSkill(i, { level: e.target.value as SkillLevel })
                    }
                    className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                  >
                    {SKILL_LEVELS.map((lvl) => (
                      <option key={lvl} value={lvl}>
                        {lvl}
                      </option>
                    ))}
                  </select>
                  <Button
                    variant="destructive"
                    size="icon-sm"
                    onClick={() => removeAt("skills", i)}
                    aria-label="Remove skill"
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                </div>
              ))}
              <div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setProfile((p) => ({
                      ...p,
                      skills: [
                        ...p.skills,
                        { name: "", level: "intermediate" },
                      ],
                    }))
                  }
                >
                  <Plus className="size-3.5" /> Add skill
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Certifications */}
          <Card>
            <CardHeader>
              <CardTitle>Certifications</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              {profile.certifications.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No certifications yet.
                </p>
              ) : null}
              {profile.certifications.map((cert, i) => (
                <div
                  key={i}
                  className="grid items-center gap-3 sm:grid-cols-[1fr_1fr_8rem_auto]"
                >
                  <Input
                    value={cert.name}
                    onChange={(e) => updateCert(i, { name: e.target.value })}
                    placeholder="Certification"
                  />
                  <Input
                    value={cert.issuer ?? ""}
                    onChange={(e) => updateCert(i, { issuer: e.target.value })}
                    placeholder="Issuer"
                  />
                  <Input
                    value={cert.year ?? ""}
                    onChange={(e) => updateCert(i, { year: e.target.value })}
                    placeholder="Year"
                  />
                  <Button
                    variant="destructive"
                    size="icon-sm"
                    onClick={() => removeAt("certifications", i)}
                    aria-label="Remove certification"
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                </div>
              ))}
              <div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setProfile((p) => ({
                      ...p,
                      certifications: [
                        ...p.certifications,
                        { name: "", issuer: "", year: "" },
                      ],
                    }))
                  }
                >
                  <Plus className="size-3.5" /> Add certification
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="sticky bottom-4 z-10 flex flex-wrap items-center gap-3 rounded-xl bg-card/80 p-3 ring-1 ring-foreground/10 backdrop-blur">
            <Button
              onClick={() => saveMutation.mutate(profile)}
              disabled={saveMutation.isPending || !profile.contact.name.trim()}
            >
              {saveMutation.isPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Save className="size-4" />
              )}
              Save profile
            </Button>
            <Button
              variant="outline"
              onClick={() => exportMutation.mutate()}
              disabled={exportMutation.isPending || !profile.contact.name.trim()}
            >
              {exportMutation.isPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Download className="size-4" />
              )}
              Export PDF
            </Button>
            {!profile.contact.name.trim() ? (
              <span className="text-xs text-muted-foreground">
                Add a name to save.
              </span>
            ) : null}
          </div>
        </>
      )}
    </div>
  );
}

function Field({
  label,
  className,
  children,
}: {
  label: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={`flex flex-col gap-1.5 ${className ?? ""}`}>
      <Label>{label}</Label>
      {children}
    </div>
  );
}
