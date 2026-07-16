import { lazy, Suspense, useEffect, useRef, useState } from "react";
import {
  Button,
  Card,
  Group,
  PasswordInput,
  SimpleGrid,
  Stack,
  Tabs,
  Text,
  TextInput,
  Title,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { Navigate, Route, Routes, useNavigate } from "react-router-dom";
import {
  Building2,
  BriefcaseBusiness,
  CheckCircle2,
  ChevronRight,
  Clock3,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  UsersRound,
  UserRound,
  Workflow,
} from "lucide-react";
import { motion, useReducedMotion, useScroll, useSpring } from "framer-motion";
import { useTranslation } from "react-i18next";
import type { SystemRole } from "@hirehub/shared";
import { authApi } from "./api";
import { Preferences } from "./Preferences";
import { useSession } from "./store";
import { RealtimeSync } from "./RealtimeSync";

const RecruiterPortal = lazy(() => import("./App"));
const AdminPortal = lazy(() => import("./AdminPortal"));
const CandidatePortal = lazy(() => import("./CandidatePortal"));
const demoPassword = "Demo1234!";

const demoRoles: Array<{
  role: SystemRole;
  name: string;
  email: string;
  icon: React.ReactNode;
  labelKey: string;
  descriptionKey: string;
}> = [
  {
    role: "CANDIDATE",
    name: "Minh Anh",
    email: "candidate@hirehub.vn",
    labelKey: "auth.candidate",
    descriptionKey: "auth.candidateDescription",
    icon: <UserRound />,
  },
  {
    role: "COMPANY_ADMIN",
    name: "Linh Anh",
    email: "recruiter@hirehub.vn",
    labelKey: "auth.recruiter",
    descriptionKey: "auth.recruiterDescription",
    icon: <Building2 />,
  },
  {
    role: "PLATFORM_ADMIN",
    name: "Admin",
    email: "admin@hirehub.vn",
    labelKey: "auth.admin",
    descriptionKey: "auth.adminDescription",
    icon: <ShieldCheck />,
  },
];

const destination = (role: SystemRole) =>
  role === "CANDIDATE"
    ? "/candidate"
    : role === "PLATFORM_ADMIN"
      ? "/admin"
      : "/recruiter";

function Login() {
  const { t } = useTranslation();
  const reduceMotion = useReducedMotion();
  const navigate = useNavigate();
  const setDemo = useSession((state) => state.setDemo);
  const setAuth = useSession((state) => state.setAuth);
  const [loading, setLoading] = useState<SystemRole | "form" | null>(null);
  const [mode, setMode] = useState<string | null>("demo");
  const [activePreview, setActivePreview] = useState(0);
  const [previewPaused, setPreviewPaused] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", password: "" });

  useEffect(() => {
    if (reduceMotion || previewPaused) return;
    const timer = window.setInterval(
      () => setActivePreview((current) => (current + 1) % 3),
      4200,
    );
    return () => window.clearInterval(timer);
  }, [previewPaused, reduceMotion]);

  const finishAuth = (result: Awaited<ReturnType<typeof authApi.login>>) => {
    setAuth(
      result.accessToken,
      result.user.role,
      result.user.name,
      result.user,
    );
    navigate(destination(result.user.role));
  };

  useEffect(() => {
    if (new URLSearchParams(location.search).get("oauth") !== "success") return;
    void (async () => {
      try {
        const token = await authApi.refresh();
        const user = await authApi.me();
        setAuth(token, user.role, user.name, user);
        navigate(destination(user.role), { replace: true });
      } catch (error) {
        notifications.show({
          color: "red",
          message:
            error instanceof Error ? error.message : "OAuth login failed",
        });
      }
    })();
  }, [navigate, setAuth]);

  async function enterDemo(item: (typeof demoRoles)[number]) {
    setLoading(item.role);
    try {
      finishAuth(await authApi.login(item.email, demoPassword));
      notifications.show({
        color: "teal",
        message: "Connected to HireHub API",
      });
    } catch {
      setDemo(item.role, item.name);
      notifications.show({
        color: "orange",
        title: "Local demo",
        message: "API is offline; browser demo data is active.",
      });
      navigate(destination(item.role));
    } finally {
      setLoading(null);
    }
  }

  async function submitCredentials() {
    setLoading("form");
    try {
      const result =
        mode === "register"
          ? await authApi.register(form.name, form.email, form.password)
          : await authApi.login(form.email, form.password);
      finishAuth(result);
    } catch (error) {
      notifications.show({
        color: "red",
        message:
          error instanceof Error ? error.message : "Authentication failed",
      });
    } finally {
      setLoading(null);
    }
  }

  async function forgotPassword() {
    if (!form.email)
      return notifications.show({
        color: "orange",
        message: "Enter your email first.",
      });
    try {
      const result = await authApi.forgotPassword(form.email);
      notifications.show({
        color: "teal",
        message: result.token
          ? `Demo reset token: ${result.token}`
          : "If the account exists, reset instructions have been sent.",
      });
    } catch (error) {
      notifications.show({
        color: "red",
        message: error instanceof Error ? error.message : "Request failed",
      });
    }
  }

  return (
    <main className="auth-landing">
      <div className="auth-page refined" id="login-top">
        <section className="auth-brand">
          <motion.span
            className="auth-orb auth-orb-one"
            animate={
              reduceMotion ? undefined : { x: [0, 28, 0], y: [0, -20, 0] }
            }
            transition={{ duration: 11, repeat: Infinity, ease: "easeInOut" }}
            aria-hidden="true"
          />
          <motion.span
            className="auth-orb auth-orb-two"
            animate={
              reduceMotion ? undefined : { x: [0, -22, 0], y: [0, 24, 0] }
            }
            transition={{ duration: 14, repeat: Infinity, ease: "easeInOut" }}
            aria-hidden="true"
          />
          <div className="auth-logo">
            <span>H</span>HireHub
          </div>
          <motion.div
            className="auth-story"
            initial={reduceMotion ? false : { opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
          >
            <p>{t("auth.platform")}</p>
            <h1>{t("auth.headline")}</h1>
            <span>{t("auth.intro")}</span>
            <div className="auth-proof">
              <div>
                <b>12.4d</b>
                <small>{t("auth.timeToHire")}</small>
              </div>
              <div>
                <b>86%</b>
                <small>{t("auth.responseRate")}</small>
              </div>
              <div>
                <b>4.8/5</b>
                <small>{t("auth.candidateScore")}</small>
              </div>
            </div>
          </motion.div>
          <motion.div
            className="auth-product-visual"
            initial={reduceMotion ? false : { opacity: 0, x: 40, rotate: 1 }}
            animate={{ opacity: 1, x: 0, rotate: -2 }}
            transition={{
              duration: 0.8,
              delay: 0.12,
              ease: [0.22, 1, 0.36, 1],
            }}
            onMouseEnter={() => setPreviewPaused(true)}
            onMouseLeave={() => setPreviewPaused(false)}
            onFocusCapture={() => setPreviewPaused(true)}
            onBlurCapture={() => setPreviewPaused(false)}
          >
            <span className="visual-scanline" aria-hidden="true" />
            <div className="visual-topbar">
              <div
                className="visual-pagination"
                aria-label={t("auth.previewNavigation")}
              >
                {["New candidates", "Interviews", "Offers"].map(
                  (label, index) => (
                    <button
                      key={label}
                      type="button"
                      className={activePreview === index ? "active" : ""}
                      aria-label={label}
                      aria-pressed={activePreview === index}
                      onClick={() => setActivePreview(index)}
                    />
                  ),
                )}
              </div>
              <b>{t("auth.pipelinePreview")}</b>
            </div>
            <motion.div
              className={`visual-columns preview-${activePreview}`}
              key={activePreview}
              initial={reduceMotion ? false : { opacity: 0.72, x: 6 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.24 }}
            >
              <div>
                <small>NEW · 18</small>
                <motion.article
                  animate={reduceMotion ? undefined : { y: [0, -5, 0] }}
                  transition={{
                    duration: 4,
                    repeat: Infinity,
                    ease: "easeInOut",
                  }}
                >
                  <i className="visual-avatar avatar-linh">LA</i>
                  <span>
                    <b>Linh Anh</b>
                    <small>Product designer</small>
                  </span>
                  <em>92</em>
                </motion.article>
                <article className="visual-muted-card" />
              </div>
              <div>
                <small>INTERVIEW · 6</small>
                <article>
                  <i className="visual-avatar avatar-minh">MK</i>
                  <span>
                    <b>Minh Khoa</b>
                    <small>Frontend engineer</small>
                  </span>
                  <em>88</em>
                </article>
                <div className="visual-interview">
                  <Clock3 size={13} />
                  <span>10:30 · Product round</span>
                </div>
              </div>
              <div>
                <small>OFFER · 3</small>
                <article>
                  <i className="visual-avatar avatar-an">AN</i>
                  <span>
                    <b>An Nguyen</b>
                    <small>Growth lead</small>
                  </span>
                  <Sparkles size={14} />
                </article>
                <div className="visual-growth">
                  <TrendingUp size={14} />
                  <b>+24%</b>
                  <span>this month</span>
                </div>
              </div>
            </motion.div>
            <span
              key={`progress-${activePreview}-${previewPaused}`}
              className={`visual-progress ${previewPaused ? "paused" : ""}`}
              aria-hidden="true"
            />
          </motion.div>
          <small className="auth-stack">React · NestJS · PostgreSQL</small>
        </section>
        <motion.section
          className="auth-form"
          initial={reduceMotion ? false : { x: 22 }}
          animate={{ x: 0 }}
          transition={{ duration: 0.55, delay: 0.08, ease: [0.22, 1, 0.36, 1] }}
        >
          <Stack maw={480} w="100%" gap="lg">
            <Group justify="space-between">
              <Text size="xs" fw={700} c="#6842d7">
                HIREHUB
              </Text>
              <Preferences />
            </Group>
            <Tabs value={mode} onChange={setMode} keepMounted={false}>
              <Tabs.List grow>
                <Tabs.Tab value="demo">Demo</Tabs.Tab>
                <Tabs.Tab value="login">{t("auth.signIn")}</Tabs.Tab>
                <Tabs.Tab value="register">{t("auth.register")}</Tabs.Tab>
              </Tabs.List>
              <Tabs.Panel value="demo" pt="lg">
                <Stack>
                  <div>
                    <Title order={2}>{t("auth.chooseRole")}</Title>
                    <Text size="sm" c="dimmed" mt={6}>
                      {t("auth.demoHint")}
                    </Text>
                  </div>
                  <SimpleGrid cols={1}>
                    {demoRoles.map((item) => (
                      <Card
                        component="button"
                        key={item.role}
                        withBorder
                        radius="md"
                        padding="lg"
                        onClick={() => enterDemo(item)}
                        className="role-card"
                        aria-busy={loading === item.role}
                      >
                        <Group wrap="nowrap">
                          <span className="role-icon">{item.icon}</span>
                          <div style={{ flex: 1, textAlign: "left" }}>
                            <Text fw={700}>{t(item.labelKey)}</Text>
                            <Text size="xs" c="dimmed">
                              {t(item.descriptionKey)}
                            </Text>
                          </div>
                          <ChevronRight size={17} />
                        </Group>
                      </Card>
                    ))}
                  </SimpleGrid>
                </Stack>
              </Tabs.Panel>
              <Tabs.Panel value="login" pt="lg">
                <CredentialForm
                  mode="login"
                  form={form}
                  setForm={setForm}
                  submit={submitCredentials}
                  loading={loading === "form"}
                  forgot={forgotPassword}
                />
              </Tabs.Panel>
              <Tabs.Panel value="register" pt="lg">
                <CredentialForm
                  mode="register"
                  form={form}
                  setForm={setForm}
                  submit={submitCredentials}
                  loading={loading === "form"}
                />
              </Tabs.Panel>
            </Tabs>
            <Button component="a" href={authApi.googleUrl} variant="default">
              {t("auth.google")}
            </Button>
          </Stack>
        </motion.section>
      </div>
      <ProjectIntro />
    </main>
  );
}

function ProjectIntro() {
  const { t } = useTranslation();
  const reduceMotion = useReducedMotion();
  const sectionRef = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start end", "end start"],
  });
  const progress = useSpring(scrollYProgress, { stiffness: 90, damping: 24 });
  const reveal = reduceMotion
    ? {}
    : { initial: { opacity: 0, y: 34 }, whileInView: { opacity: 1, y: 0 } };
  const portals = [
    {
      icon: <UserRound />,
      title: t("auth.aboutCandidate"),
      text: t("auth.aboutCandidateText"),
    },
    {
      icon: <BriefcaseBusiness />,
      title: t("auth.aboutRecruiter"),
      text: t("auth.aboutRecruiterText"),
    },
    {
      icon: <ShieldCheck />,
      title: t("auth.aboutAdmin"),
      text: t("auth.aboutAdminText"),
    },
  ];
  const journey = [
    t("auth.flowDiscover"),
    t("auth.flowApply"),
    t("auth.flowInterview"),
    t("auth.flowOffer"),
  ];

  return (
    <section className="project-intro" id="about-hirehub" ref={sectionRef}>
      <motion.span
        className="intro-scroll-progress"
        style={{ scaleX: progress }}
        aria-hidden="true"
      />
      <motion.header
        {...reveal}
        viewport={{ once: true, amount: 0.35 }}
        transition={{ duration: 0.65 }}
      >
        <div>
          <span className="intro-kicker">
            <Sparkles size={14} /> {t("auth.aboutKicker")}
          </span>
          <h2>{t("auth.aboutTitle")}</h2>
        </div>
        <div className="intro-lead">
          <span>01 — 04</span>
          <p>{t("auth.aboutText")}</p>
          <div>
            <b>3</b>
            <small>PORTALS</small>
            <b>1</b>
            <small>PLATFORM</small>
          </div>
        </div>
      </motion.header>

      <div className="intro-portals">
        {portals.map((portal, index) => (
          <motion.article
            key={portal.title}
            className={`portal-card portal-card-${index + 1}`}
            {...reveal}
            viewport={{ once: true, amount: 0.35 }}
            transition={{ duration: 0.55, delay: index * 0.1 }}
            whileHover={
              reduceMotion
                ? undefined
                : { y: -8, rotate: index === 1 ? -0.5 : 0.5 }
            }
          >
            <span>{portal.icon}</span>
            <small>0{index + 1}</small>
            {index === 1 && (
              <div className="recruiter-mini-pipeline" aria-hidden="true">
                <div className="mini-pipeline-head">
                  <span>Product Designer</span>
                  <em>24 candidates</em>
                </div>
                <div className="mini-pipeline-grid">
                  <div>
                    <small>NEW · 12</small>
                    <motion.b
                      animate={reduceMotion ? undefined : { y: [0, -4, 0] }}
                      transition={{ duration: 3.8, repeat: Infinity }}
                    >
                      <i>MA</i>
                      <span>
                        Minh Anh<em>92% match</em>
                      </span>
                    </motion.b>
                    <b className="mini-ghost" />
                  </div>
                  <div>
                    <small>REVIEW · 8</small>
                    <b>
                      <i>KL</i>
                      <span>
                        Khánh Linh<em>Portfolio</em>
                      </span>
                    </b>
                    <b className="mini-ghost" />
                  </div>
                  <div>
                    <small>INTERVIEW · 4</small>
                    <b>
                      <i>TN</i>
                      <span>
                        Tuấn Nam<em>Tomorrow · 10:30</em>
                      </span>
                    </b>
                    <strong>
                      <TrendingUp size={12} /> +18%
                    </strong>
                  </div>
                </div>
              </div>
            )}
            <h3>{portal.title}</h3>
            <p>{portal.text}</p>
          </motion.article>
        ))}
      </div>

      <div className="intro-marquee" aria-hidden="true">
        <motion.div
          animate={reduceMotion ? undefined : { x: ["0%", "-50%"] }}
          transition={{ duration: 24, repeat: Infinity, ease: "linear" }}
        >
          <span>DISCOVER</span>
          <i /> <span>APPLY</span>
          <i /> <span>INTERVIEW</span>
          <i /> <span>OFFER</span>
          <i />
          <span>DISCOVER</span>
          <i /> <span>APPLY</span>
          <i /> <span>INTERVIEW</span>
          <i /> <span>OFFER</span>
          <i />
        </motion.div>
      </div>

      <motion.div
        className="intro-flow"
        {...reveal}
        viewport={{ once: true, amount: 0.25 }}
        transition={{ duration: 0.65 }}
      >
        <div className="intro-flow-copy">
          <span>
            <Workflow size={16} /> {t("auth.flowKicker")}
          </span>
          <h2>{t("auth.flowTitle")}</h2>
          <p>{t("auth.flowText")}</p>
        </div>
        <div className="intro-steps">
          {journey.map((step, index) => (
            <motion.div
              key={step}
              initial={reduceMotion ? false : { opacity: 0.35, x: 28 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ amount: 0.65 }}
              transition={{ duration: 0.42 }}
            >
              <i>{index + 1}</i>
              <span>{step}</span>
              {index < journey.length - 1 && <em />}
            </motion.div>
          ))}
        </div>
      </motion.div>

      <motion.div
        className="intro-tech"
        {...reveal}
        viewport={{ once: true, amount: 0.3 }}
        transition={{ duration: 0.65 }}
      >
        <motion.div whileHover={reduceMotion ? undefined : { y: -6 }}>
          <UsersRound />
          <strong>{t("auth.multiTenant")}</strong>
          <span>{t("auth.multiTenantText")}</span>
        </motion.div>
        <motion.div whileHover={reduceMotion ? undefined : { y: -6 }}>
          <CheckCircle2 />
          <strong>{t("auth.productionReady")}</strong>
          <span>{t("auth.productionReadyText")}</span>
        </motion.div>
        <motion.div whileHover={reduceMotion ? undefined : { y: -6 }}>
          <TrendingUp />
          <strong>{t("auth.explainableAi")}</strong>
          <span>{t("auth.explainableAiText")}</span>
        </motion.div>
      </motion.div>

      <motion.footer
        {...reveal}
        viewport={{ once: true, amount: 0.5 }}
        transition={{ duration: 0.6 }}
      >
        <div>
          <span>H</span>
          <p>
            <b>{t("auth.aboutCta")}</b>
            <small>{t("auth.aboutCtaText")}</small>
          </p>
        </div>
        <Button
          component="a"
          href="#login-top"
          rightSection={<ChevronRight size={16} />}
        >
          {t("auth.exploreDemo")}
        </Button>
      </motion.footer>
    </section>
  );
}

function CredentialForm({
  mode,
  form,
  setForm,
  submit,
  loading,
  forgot,
}: {
  mode: "login" | "register";
  form: { name: string; email: string; password: string };
  setForm: React.Dispatch<
    React.SetStateAction<{ name: string; email: string; password: string }>
  >;
  submit: () => void;
  loading: boolean;
  forgot?: () => void;
}) {
  const { t } = useTranslation();
  return (
    <Stack>
      {mode === "register" && (
        <TextInput
          required
          label={t("auth.name")}
          value={form.name}
          onChange={(event) =>
            setForm({ ...form, name: event.currentTarget.value })
          }
        />
      )}
      <TextInput
        required
        type="email"
        label="Email"
        value={form.email}
        onChange={(event) =>
          setForm({ ...form, email: event.currentTarget.value })
        }
      />
      <PasswordInput
        required
        label={t("auth.password")}
        description={mode === "register" ? "At least 8 characters" : undefined}
        value={form.password}
        onChange={(event) =>
          setForm({ ...form, password: event.currentTarget.value })
        }
      />
      <Button
        loading={loading}
        disabled={
          !form.email ||
          form.password.length < 8 ||
          (mode === "register" && !form.name.trim())
        }
        onClick={submit}
      >
        {t("auth.submit")}
      </Button>
      {forgot && (
        <Button variant="subtle" size="xs" onClick={forgot}>
          {t("auth.forgot")}
        </Button>
      )}
    </Stack>
  );
}

function Protected({
  role,
  children,
}: {
  role: SystemRole;
  children: React.ReactNode;
}) {
  const current = useSession((state) => state.role);
  return current === role ||
    (role === "COMPANY_ADMIN" && current === "RECRUITER") ? (
    children
  ) : (
    <Navigate to="/login" />
  );
}
export default function Root() {
  return (
    <Suspense
      fallback={
        <div
          style={{ minHeight: "100vh", display: "grid", placeItems: "center" }}
        >
          Loading HireHub...
        </div>
      }
    >
      <RealtimeSync />
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route
          path="/candidate/*"
          element={
            <Protected role="CANDIDATE">
              <CandidatePortal />
            </Protected>
          }
        />
        <Route
          path="/recruiter/*"
          element={
            <Protected role="COMPANY_ADMIN">
              <RecruiterPortal />
            </Protected>
          }
        />
        <Route
          path="/admin/*"
          element={
            <Protected role="PLATFORM_ADMIN">
              <AdminPortal />
            </Protected>
          }
        />
        <Route path="*" element={<Navigate to="/login" />} />
      </Routes>
    </Suspense>
  );
}
