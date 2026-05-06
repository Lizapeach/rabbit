import { useMemo, useState } from "react";

import ClickSpark from "../components/ClickSpark";
import AnimatedContent from "../components/AnimatedContent";
import BorderGlow from "../components/BorderGlow";

import "../styles/auth.css";

const API_BASE_URL = import.meta.env.VITE_API_URL || "";
const TOKEN_STORAGE_KEY = "habbit-auth-token";

const AUTH_TABS = {
  login: {
    label: "Вход",
    title: "С возвращением",
    text: "Войди по почте и паролю, чтобы перейти в лобби привычек.",
  },
  register: {
    label: "Регистрация",
    title: "Создай аккаунт",
    text: "Укажи почту, пароль и имя, которое будет видно в приложении.",
  },
};

function normalizeText(value) {
  return String(value || "").trim();
}

function formatRegisteredAt(date = new Date()) {
  return new Intl.DateTimeFormat("ru-RU", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
}

function formatBackendDate(value) {
  if (!value) return formatRegisteredAt();

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return formatRegisteredAt(date);
}

function getFiniteNumber(...values) {
  for (const value of values) {
    const number = Number(value);

    if (Number.isFinite(number)) {
      return number;
    }
  }

  return null;
}

function getBackendMessage(error) {
  if (error?.message) return error.message;
  return "Не удалось выполнить запрос. Проверь подключение к backend.";
}

function validateEmail(email) {
  const normalizedEmail = normalizeText(email);

  if (!normalizedEmail) return "Необходимо заполнить email";
  if (!normalizedEmail.includes("@")) return "Некорректный email";

  return "";
}

function validatePassword(password) {
  if (!password) return "Необходимо заполнить пароль";
  if (password.length < 6) return "Пароль должен быть не короче 6 символов";

  return "";
}

function validateName(name) {
  const normalizedName = normalizeText(name);

  if (!normalizedName) return "Необходимо заполнить имя";
  if (normalizedName.length < 2) return "Имя должно быть не короче 2 символов";

  return "";
}

function validateLoginData({ email, password }) {
  return validateEmail(email) || validatePassword(password);
}

function validateRegisterData({ email, password, repeatPassword, name }) {
  const emailError = validateEmail(email);
  if (emailError) return emailError;

  const passwordError = validatePassword(password);
  if (passwordError) return passwordError;

  if (!repeatPassword) return "Повтори пароль";
  if (password !== repeatPassword) return "Пароли не совпадают";

  return validateName(name);
}

async function requestAuth(endpoint, payload) {
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data?.message || "Ошибка авторизации");
  }

  return data;
}

function saveTokenFromResponse(data) {
  if (typeof window === "undefined") return;

  const token = data?.token || data?.accessToken || data?.access_token;
  if (!token) return;

  window.localStorage.setItem(TOKEN_STORAGE_KEY, token);
}

function buildProfileFromResponse(data, fallback) {
  const user = data?.user || data?.profile || data?.data?.user || {};
  const coins = getFiniteNumber(
    user.coinsBalance,
    user.coins,
    user.coins_balance,
    fallback.coins
  );

  return {
    id: user.id ?? fallback.id,
    name: user.name || fallback.name || "Пользователь",
    email: user.email || fallback.email || "",
    coins: coins ?? 0,
    registeredAt: user.registeredAt
      ? formatBackendDate(user.registeredAt)
      : user.registered_at
        ? formatBackendDate(user.registered_at)
        : fallback.registeredAt || formatRegisteredAt(),
    activeUserAvatarId: user.activeUserAvatarId ?? fallback.activeUserAvatarId,
    avatarBgColor: user.avatarBgColor || fallback.avatarBgColor,
  };
}

function AuthField({ label, helper, error, ...props }) {
  return (
    <label className="auth-field">
      <span className="auth-field__label">{label}</span>
      <input className="auth-field__input" aria-invalid={Boolean(error)} {...props} />
      {error ? <span className="auth-field__error">{error}</span> : null}
      {!error && helper ? <span className="auth-field__helper">{helper}</span> : null}
    </label>
  );
}

export default function AuthPage({ navigate, onAuthSuccess, userProfile }) {
  const [activeTab, setActiveTab] = useState("login");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });
  const [touched, setTouched] = useState({});

  const [loginData, setLoginData] = useState({
    email: "",
    password: "",
  });

  const [registerData, setRegisterData] = useState({
    email: "",
    password: "",
    repeatPassword: "",
    name: "",
  });

  const activeCopy = AUTH_TABS[activeTab];

  const loginErrors = useMemo(
    () => ({
      email: touched.loginEmail ? validateEmail(loginData.email) : "",
      password: touched.loginPassword ? validatePassword(loginData.password) : "",
    }),
    [loginData, touched.loginEmail, touched.loginPassword]
  );

  const registerErrors = useMemo(
    () => ({
      email: touched.registerEmail ? validateEmail(registerData.email) : "",
      password: touched.registerPassword ? validatePassword(registerData.password) : "",
      repeatPassword:
        touched.registerRepeatPassword && registerData.password !== registerData.repeatPassword
          ? "Пароли не совпадают"
          : "",
      name: touched.registerName ? validateName(registerData.name) : "",
    }),
    [registerData, touched]
  );

  const setTab = (nextTab) => {
    if (nextTab === activeTab) return;

    setActiveTab(nextTab);
    setMessage({ type: "", text: "" });
  };

  const markTouched = (field) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
  };

  const updateLoginField = (field, value) => {
    setLoginData((prev) => ({ ...prev, [field]: value }));
  };

  const updateRegisterField = (field, value) => {
    setRegisterData((prev) => ({ ...prev, [field]: value }));
  };

  const finishAuth = (data, fallbackProfile) => {
    saveTokenFromResponse(data);

    const nextProfile = buildProfileFromResponse(data, {
      ...userProfile,
      ...fallbackProfile,
    });

    onAuthSuccess?.(nextProfile);
    navigate?.("/lobby");
  };

  const handleLoginSubmit = async (event) => {
    event.preventDefault();
    setTouched((prev) => ({ ...prev, loginEmail: true, loginPassword: true }));

    const validationError = validateLoginData(loginData);
    if (validationError) {
      setMessage({ type: "error", text: validationError });
      return;
    }

    setIsSubmitting(true);
    setMessage({ type: "", text: "" });

    try {
      const payload = {
        email: normalizeText(loginData.email),
        password: loginData.password,
      };

      const data = await requestAuth("/api/auth/login", payload);
      finishAuth(data, { email: payload.email });
    } catch (error) {
      setMessage({ type: "error", text: getBackendMessage(error) });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRegisterSubmit = async (event) => {
    event.preventDefault();
    setTouched((prev) => ({
      ...prev,
      registerEmail: true,
      registerPassword: true,
      registerRepeatPassword: true,
      registerName: true,
    }));

    const validationError = validateRegisterData(registerData);
    if (validationError) {
      setMessage({ type: "error", text: validationError });
      return;
    }

    setIsSubmitting(true);
    setMessage({ type: "", text: "" });

    try {
      const payload = {
        name: normalizeText(registerData.name),
        email: normalizeText(registerData.email),
        password: registerData.password,
      };

      const data = await requestAuth("/api/auth/register", payload);
      finishAuth(data, {
        name: payload.name,
        email: payload.email,
        registeredAt: formatRegisteredAt(),
      });
    } catch (error) {
      setMessage({ type: "error", text: getBackendMessage(error) });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ClickSpark>
      <div className="auth-page">
        <div className="auth-page__decor" aria-hidden="true">
          <span className="auth-page__orb auth-page__orb--one" />
          <span className="auth-page__orb auth-page__orb--two" />
          <span className="auth-page__orb auth-page__orb--three" />
        </div>

        <div className="auth-container">
          <main className="auth-main">
            <AnimatedContent distance={80} duration={0.8} delay={0}>
              <div className="auth-shell">
                <div className="auth-tabs" role="tablist" aria-label="Авторизация">
                  <span
                    className="auth-tabs__thumb"
                    style={{ "--auth-tab-index": activeTab === "login" ? 0 : 1 }}
                    aria-hidden="true"
                  />

                  {Object.entries(AUTH_TABS).map(([value, item]) => (
                    <button
                      key={value}
                      id={`auth-tab-${value}`}
                      type="button"
                      role="tab"
                      aria-selected={activeTab === value}
                      aria-controls={`auth-panel-${value}`}
                      className={`auth-tabs__button${
                        activeTab === value ? " auth-tabs__button--active" : ""
                      }`}
                      onClick={() => setTab(value)}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>

                <BorderGlow>
                  <section className="auth-card" aria-labelledby="auth-title">
                    <div className="auth-card__form-side">
                      <div className="auth-form-head">
                        <h1 id="auth-title" className="section-title">
                          {activeCopy.title}
                        </h1>
                        <p className="section-description">{activeCopy.text}</p>
                      </div>

                      {message.text ? (
                        <div className={`auth-message auth-message--${message.type}`} role="alert">
                          {message.text}
                        </div>
                      ) : null}

                      <div className={`auth-tab-contents auth-tab-contents--${activeTab}`}>
                        <form
                          id="auth-panel-login"
                          role="tabpanel"
                          aria-labelledby="auth-tab-login"
                          aria-hidden={activeTab !== "login"}
                          className={`auth-tab-panel auth-form${
                            activeTab === "login" ? " auth-tab-panel--active" : ""
                          }`}
                          onSubmit={handleLoginSubmit}
                        >
                          <AuthField
                            label="Почта"
                            type="email"
                            placeholder="name@mail.com"
                            autoComplete="email"
                            value={loginData.email}
                            error={loginErrors.email}
                            onChange={(event) => updateLoginField("email", event.target.value)}
                            onBlur={() => markTouched("loginEmail")}
                          />

                          <AuthField
                            label="Пароль"
                            type="password"
                            placeholder="Минимум 6 символов"
                            autoComplete="current-password"
                            value={loginData.password}
                            error={loginErrors.password}
                            onChange={(event) => updateLoginField("password", event.target.value)}
                            onBlur={() => markTouched("loginPassword")}
                          />

                          <button className="auth-submit" type="submit" disabled={isSubmitting}>
                            {isSubmitting && activeTab === "login" ? "Входим..." : "Войти в лобби"}
                          </button>
                        </form>

                        <form
                          id="auth-panel-register"
                          role="tabpanel"
                          aria-labelledby="auth-tab-register"
                          aria-hidden={activeTab !== "register"}
                          className={`auth-tab-panel auth-form${
                            activeTab === "register" ? " auth-tab-panel--active" : ""
                          }`}
                          onSubmit={handleRegisterSubmit}
                        >
                          <AuthField
                            label="Почта"
                            type="email"
                            placeholder="name@mail.com"
                            autoComplete="email"
                            value={registerData.email}
                            error={registerErrors.email}
                            onChange={(event) => updateRegisterField("email", event.target.value)}
                            onBlur={() => markTouched("registerEmail")}
                          />

                          <AuthField
                            label="Пароль"
                            type="password"
                            placeholder="Минимум 6 символов"
                            autoComplete="new-password"
                            value={registerData.password}
                            error={registerErrors.password}
                            onChange={(event) => updateRegisterField("password", event.target.value)}
                            onBlur={() => markTouched("registerPassword")}
                          />

                          <AuthField
                            label="Повтори пароль"
                            type="password"
                            placeholder="Ещё раз тот же пароль"
                            autoComplete="new-password"
                            value={registerData.repeatPassword}
                            error={registerErrors.repeatPassword}
                            onChange={(event) => updateRegisterField("repeatPassword", event.target.value)}
                            onBlur={() => markTouched("registerRepeatPassword")}
                          />

                          <AuthField
                            label="Имя"
                            type="text"
                            placeholder="Например, Елизавета"
                            autoComplete="given-name"
                            helper="Минимум 2 символа. Это имя будет видно в профиле и лобби."
                            value={registerData.name}
                            error={registerErrors.name}
                            onChange={(event) => updateRegisterField("name", event.target.value)}
                            onBlur={() => markTouched("registerName")}
                          />

                          <button className="auth-submit" type="submit" disabled={isSubmitting}>
                            {isSubmitting && activeTab === "register" ? "Создаём..." : "Создать аккаунт"}
                          </button>
                        </form>
                      </div>
                    </div>
                  </section>
                </BorderGlow>
              </div>
            </AnimatedContent>
          </main>
        </div>
      </div>
    </ClickSpark>
  );
}
