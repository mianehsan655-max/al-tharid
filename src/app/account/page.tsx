"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import {
  claimLoyaltyMilestone,
  loginCustomerWithPassword,
  lookupOrJoinLoyalty,
  requestCustomerSignupOtp,
  updateCustomerProfileAddress,
  verifyCustomerSignupOtp,
  type LoyaltyCardState,
} from "../actions";
import { formatPKR, statusLabels } from "@/lib/orderTypes";
import type { Category } from "@/lib/store";

const STORAGE_KEY = "al-tharid-loyalty-phone";
const SESSION_KEY = "al-tharid-customer-session";

const CATEGORY_ICON_MAP: Record<Category, { icon: string; short: string }> = {
  Shawarma: { icon: "🌯", short: "Shawarma" },
  Burger: { icon: "🍔", short: "Burger" },
  "Chicken Broast": { icon: "🍗", short: "Broast" },
  "Loaded Fries": { icon: "🍟", short: "Fries" },
  "Cold Drinks": { icon: "🥤", short: "Drink" },
  Deals: { icon: "🍱", short: "Combo" },
};

export default function CustomerAccountPage() {
  const router = useRouter();
  const [authTab, setAuthTab] = useState<"login" | "signup">("login");
  const [otpChannel, setOtpChannel] = useState<"mobile" | "email">("mobile");

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [address, setAddress] = useState("");
  const [favoriteCategory, setFavoriteCategory] =
    useState<Category>("Shawarma");

  const [pendingOtp, setPendingOtp] = useState<{
    otpId: string;
    channel: "mobile" | "email";
    targetDisplay: string;
    demoOtpCode: string;
  } | null>(null);
  const [otpCode, setOtpCode] = useState("");

  const [loginIdentifier, setLoginIdentifier] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  const [card, setCard] = useState<LoyaltyCardState | null>(null);
  const [initializing, setInitializing] = useState(true);
  const [loading, setLoading] = useState(false);
  const [refreshingOrders, setRefreshingOrders] = useState(false);
  const [claimingTarget, setClaimingTarget] = useState<number | null>(null);
  const [mysteryOpened, setMysteryOpened] = useState(false);
  const [mysteryShaking, setMysteryShaking] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [copiedCode, setCopiedCode] = useState("");

  useEffect(() => {
    try {
      const savedPhone = localStorage.getItem(STORAGE_KEY);
      if (savedPhone) {
        void lookupOrJoinLoyalty({ phone: savedPhone })
          .then((res) => {
            if (res.ok) {
              setCard(res.card);
              setAddress(res.card.member.address ?? "");
              setFavoriteCategory(res.card.member.favoriteCategory);
            }
          })
          .finally(() => setInitializing(false));
      } else {
        setInitializing(false);
      }
    } catch {
      setInitializing(false);
    }
  }, []);

  function persistCustomerSession(nextCard: LoyaltyCardState) {
    try {
      localStorage.setItem(STORAGE_KEY, nextCard.member.phone);
      localStorage.setItem(
        SESSION_KEY,
        JSON.stringify({
          id: nextCard.member.id,
          name: nextCard.member.name,
          username: nextCard.member.username,
          phone: nextCard.member.phone,
          email: nextCard.member.email,
          address: nextCard.member.address,
        }),
      );
      window.dispatchEvent(new Event("al-tharid-auth-change"));
    } catch {
      /* Ignore storage errors */
    }
  }

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (loading) return;
    setLoading(true);
    setError("");
    setNotice("");
    try {
      const result = await loginCustomerWithPassword({
        identifier: loginIdentifier,
        password: loginPassword,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setCard(result.card);
      setAddress(result.card.member.address ?? "");
      setFavoriteCategory(result.card.member.favoriteCategory);
      persistCustomerSession(result.card);
      setNotice(`Welcome back, ${result.card.member.name}!`);
    } catch {
      setError("Could not log in right now. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function handleRequestOtp(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (loading) return;
    setLoading(true);
    setError("");
    setNotice("");
    try {
      const result = await requestCustomerSignupOtp({
        name,
        phone,
        email,
        channel: otpChannel,
        password,
        address,
        favoriteCategory,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setPendingOtp({
        otpId: result.otpId,
        channel: result.channel,
        targetDisplay: result.targetDisplay,
        demoOtpCode: result.demoOtpCode,
      });
      setOtpCode(result.demoOtpCode);
      setNotice(
        `6-digit verification OTP sent to your ${
          result.channel === "email" ? "email" : "mobile number"
        } (${result.targetDisplay}).`,
      );
    } catch {
      setError("Could not send OTP right now. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function handleVerifyOtp(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!pendingOtp || loading) return;
    setLoading(true);
    setError("");
    setNotice("");
    try {
      const result = await verifyCustomerSignupOtp({
        otpId: pendingOtp.otpId,
        code: otpCode,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setCard(result.card);
      setAddress(result.card.member.address ?? "");
      setPendingOtp(null);
      setOtpCode("");
      persistCustomerSession(result.card);
      setNotice(
        `🎉 Account verified & logged in! Welcome, ${result.card.member.name}!`,
      );
    } catch {
      setError("Could not verify OTP. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function handleRefreshOrders() {
    if (!card || refreshingOrders) return;
    setRefreshingOrders(true);
    try {
      const res = await lookupOrJoinLoyalty({ phone: card.member.phone });
      if (res.ok) {
        setCard(res.card);
        setNotice("✓ Order history & live status updated!");
      }
    } finally {
      setRefreshingOrders(false);
    }
  }

  async function handleUpdateProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!card || loading) return;
    setLoading(true);
    setError("");
    setNotice("");
    try {
      const res = await updateCustomerProfileAddress({
        memberId: card.member.id,
        address,
        favoriteCategory,
      });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      const nextCard: LoyaltyCardState = {
        ...card,
        member: res.member,
      };
      setCard(nextCard);
      persistCustomerSession(nextCard);
      setNotice("✓ Profile details saved!");
    } catch {
      setError("Could not update profile.");
    } finally {
      setLoading(false);
    }
  }

  async function handleClaimTenOrderReward() {
    if (!card || claimingTarget !== null) return;
    setClaimingTarget(10);
    setError("");
    try {
      const result = await claimLoyaltyMilestone({
        phone: card.member.phone,
        targetOrders: 10,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setCard(result.card);
      setMysteryOpened(true);
      setNotice(
        `🎉 Congratulations! Use voucher code ${result.claimedCode} at checkout!`,
      );
    } catch {
      setError("Could not claim prize right now.");
    } finally {
      setClaimingTarget(null);
    }
  }

  function triggerMysteryUnbox() {
    if (mysteryShaking) return;
    setMysteryShaking(true);
    window.setTimeout(() => {
      setMysteryShaking(false);
      setMysteryOpened(true);
    }, 600);
  }

  function handleLogout() {
    try {
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem(SESSION_KEY);
      sessionStorage.removeItem("al-tharid-last-receipt");
      window.dispatchEvent(new Event("al-tharid-auth-change"));
    } catch {
      /* Ignore */
    }
    setCard(null);
    setLoginIdentifier("");
    setLoginPassword("");
    router.push("/");
  }

  const clampedStamps = Math.min(10, Math.max(0, card?.totalStamps ?? 0));
  const evalInfo = card?.rewardEvaluation;
  const claimedTenObj = card?.member.rewardCodes.find((r) => r.target === 10);

  return (
    <main id="main" className="account-page">
      <div className="wrap">
        {initializing ? (
          <div className="checkout-loading" role="status">
            <span />
            Loading your account…
          </div>
        ) : !card ? (
          /* LOGGED-OUT VIEW: Dedicated Login & Sign Up Page */
          <div className="account-auth-shell">
            <div className="account-auth-intro">
              <span className="kicker">AL-THARID CUSTOMER PORTAL</span>
              <h1>
                Track Orders &amp;{" "}
                <em>Unlock Free Food.</em>
              </h1>
              <p>
                Log in with your username (or mobile/email) and password to see
                your live order status, full order history, and your 10-Order
                Bonus Card &amp; Mystery Unbox rewards.
              </p>
              <div className="account-auth-perks">
                <div>
                  <span>🛵</span>
                  <div>
                    <strong>Live Order Tracking &amp; History</strong>
                    <small>
                      See every order from kitchen preparation to doorstep
                      delivery.
                    </small>
                  </div>
                </div>
                <div>
                  <span>🌯</span>
                  <div>
                    <strong>10 Same-Item Orders = Free Same Item</strong>
                    <small>
                      Complete 10 Shawarma, Burger, Broast, or Fries orders to
                      get that same item FREE!
                    </small>
                  </div>
                </div>
                <div>
                  <span>🎁</span>
                  <div>
                    <strong>10 Mixed Orders = Mystery Unbox</strong>
                    <small>
                      Order a mix of cravings across 10 orders to unbox a
                      surprise reward at the end!
                    </small>
                  </div>
                </div>
              </div>
            </div>

            <div className="loyalty-signup-panel account-auth-box">
              <div className="customer-auth-tabs" role="tablist">
                <button
                  type="button"
                  role="tab"
                  aria-selected={authTab === "login"}
                  className={authTab === "login" ? "is-active" : ""}
                  onClick={() => {
                    setAuthTab("login");
                    setError("");
                    setNotice("");
                  }}
                >
                  🔐 Login
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={authTab === "signup"}
                  className={authTab === "signup" ? "is-active" : ""}
                  onClick={() => {
                    setAuthTab("signup");
                    setError("");
                    setNotice("");
                  }}
                >
                  ✨ Sign Up (OTP)
                </button>
              </div>

              <h2>
                {authTab === "login"
                  ? "Customer Login"
                  : pendingOtp
                    ? "Verify 6-Digit OTP"
                    : "Create Your Account"}
              </h2>
              <p>
                {authTab === "login"
                  ? "Enter your Username / Name, Mobile Number, or Email and your password."
                  : "Simple sign up with Name, Mobile Number (or Email), Password, and optional Address."}
              </p>

              {notice && (
                <div className="loyalty-alert is-success" role="status">
                  {notice}
                </div>
              )}
              {error && (
                <div className="loyalty-alert is-error" role="alert">
                  {error}
                </div>
              )}

              {authTab === "login" ? (
                <form
                  onSubmit={(e) => void handleLogin(e)}
                  className="loyalty-form"
                >
                  <label>
                    Username, Mobile Number, or Email *
                    <input
                      type="text"
                      value={loginIdentifier}
                      onChange={(e) => setLoginIdentifier(e.target.value)}
                      placeholder="e.g. Ali Hassan or 0300 1234567"
                      maxLength={120}
                      required
                    />
                  </label>

                  <label>
                    Password *
                    <input
                      type="password"
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      placeholder="Enter your password"
                      maxLength={80}
                      required
                    />
                  </label>

                  <button
                    type="submit"
                    className="primary-button loyalty-form__submit"
                    disabled={loading}
                  >
                    <span>{loading ? "Logging in…" : "Login to My Account"}</span>
                    <span aria-hidden="true">↗</span>
                  </button>
                </form>
              ) : !pendingOtp ? (
                <form
                  onSubmit={(e) => void handleRequestOtp(e)}
                  className="loyalty-form"
                >
                  <div
                    className="otp-channel-switch"
                    role="radiogroup"
                    aria-label="Verify OTP via"
                  >
                    <button
                      type="button"
                      className={otpChannel === "mobile" ? "is-active" : ""}
                      onClick={() => setOtpChannel("mobile")}
                    >
                      📱 Mobile OTP
                    </button>
                    <button
                      type="button"
                      className={otpChannel === "email" ? "is-active" : ""}
                      onClick={() => setOtpChannel("email")}
                    >
                      ✉️ Email OTP
                    </button>
                  </div>

                  <label>
                    Your Name (Username) *
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. Ali Hassan"
                      maxLength={60}
                      required
                    />
                  </label>

                  <label>
                    Pakistani Mobile Number{" "}
                    {otpChannel === "mobile" ? "*" : "(For Order Stamps)"}
                    <input
                      type="tel"
                      inputMode="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="0300 1234567"
                      maxLength={20}
                      required={otpChannel === "mobile"}
                    />
                  </label>

                  {otpChannel === "email" && (
                    <label>
                      Email Address (For OTP Verification) *
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="you@example.com"
                        maxLength={120}
                        required
                      />
                    </label>
                  )}

                  <label>
                    Create Password (for Login) *
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="At least 4 characters"
                      minLength={4}
                      maxLength={80}
                      required
                    />
                  </label>

                  <label>
                    Delivery Address{" "}
                    <span className="field-optional">(Optional)</span>
                    <input
                      type="text"
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      placeholder="Optional — e.g. Cinema Road, Jaranwala"
                      maxLength={200}
                    />
                  </label>

                  <button
                    type="submit"
                    className="primary-button loyalty-form__submit"
                    disabled={loading}
                  >
                    <span>
                      {loading
                        ? "Sending OTP…"
                        : `Send 6-Digit OTP to ${
                            otpChannel === "email" ? "Email" : "Mobile"
                          }`}
                    </span>
                    <span aria-hidden="true">↗</span>
                  </button>
                </form>
              ) : (
                <form
                  onSubmit={(e) => void handleVerifyOtp(e)}
                  className="loyalty-form otp-verify-form"
                >
                  <div className="otp-demo-banner">
                    <div>
                      <small>INSTANT OTP CODE ({pendingOtp.targetDisplay})</small>
                      <strong>{pendingOtp.demoOtpCode}</strong>
                    </div>
                    <button
                      type="button"
                      onClick={() => setOtpCode(pendingOtp.demoOtpCode)}
                    >
                      Auto-Fill OTP
                    </button>
                  </div>

                  <label>
                    Enter 6-Digit Verification OTP *
                    <input
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]{6}"
                      value={otpCode}
                      onChange={(e) =>
                        setOtpCode(e.target.value.replace(/\D/g, "").slice(0, 6))
                      }
                      placeholder="6-digit OTP code"
                      maxLength={6}
                      required
                      className="otp-code-input"
                    />
                  </label>

                  <button
                    type="submit"
                    className="primary-button loyalty-form__submit"
                    disabled={loading}
                  >
                    <span>
                      {loading
                        ? "Verifying OTP…"
                        : "Verify OTP & Create Account"}
                    </span>
                    <span aria-hidden="true">✓</span>
                  </button>

                  <button
                    type="button"
                    className="otp-back-btn"
                    onClick={() => {
                      setPendingOtp(null);
                      setError("");
                      setNotice("");
                    }}
                  >
                    ← Edit Details
                  </button>
                </form>
              )}
            </div>
          </div>
        ) : (
          /* LOGGED-IN VIEW: Minimalist Single-Screen Customer Profile Dashboard */
          <div className="account-min-dashboard">
            {/* Compact Single-Row Profile Header + Inline KPIs + Actions */}
            <header className="account-min-header">
              <div className="account-min-user">
                <span className="account-min-avatar" aria-hidden="true">
                  {card.member.name.charAt(0).toUpperCase()}
                </span>
                <div>
                  <div className="account-min-user__title">
                    <h1>{card.member.name}</h1>
                    <span className="account-min-id">{card.member.id}</span>
                  </div>
                  <p>
                    @{card.member.username ?? card.member.name} · +{card.member.phone}
                    {card.member.email ? ` · ${card.member.email}` : ""}
                  </p>
                </div>
              </div>

              <div className="account-min-metrics" aria-label="Account summary">
                <div className="account-min-metric">
                  <span>Orders</span>
                  <strong>{card.orderCount}</strong>
                </div>
                <div className="account-min-metric">
                  <span>In Kitchen</span>
                  <strong>{card.activeOrderCount}</strong>
                </div>
                <div className="account-min-metric is-highlight">
                  <span>Bonus Stamps</span>
                  <strong>{clampedStamps}/10</strong>
                </div>
              </div>

              <div className="account-min-actions">
                <button
                  type="button"
                  className="account-min-btn"
                  onClick={() => void handleRefreshOrders()}
                  disabled={refreshingOrders}
                >
                  {refreshingOrders ? "…" : "↻ Sync"}
                </button>
                <Link href="/#shawarma" className="account-min-btn is-primary">
                  + Order Food
                </Link>
                <button
                  type="button"
                  className="account-min-btn is-logout"
                  onClick={handleLogout}
                >
                  Logout
                </button>
              </div>
            </header>

            {(notice || error) && (
              <div
                className={`account-min-toast ${error ? "is-error" : "is-success"}`}
                role={error ? "alert" : "status"}
              >
                <span>{error || notice}</span>
                <button
                  type="button"
                  onClick={() => {
                    setError("");
                    setNotice("");
                  }}
                  aria-label="Dismiss message"
                >
                  ×
                </button>
              </div>
            )}

            {/* Single-Viewport Two-Column Bento Grid */}
            <div className="account-min-bento">
              {/* LEFT: Compact 10-Order Bonus Card + 1-Line Quick Profile Settings */}
              <div className="account-min-left">
                <section
                  className="account-min-bonus"
                  aria-label="10-Order Bonus Card"
                >
                  <div className="account-min-bonus__head">
                    <div>
                      <span className="account-min-badge">
                        {evalInfo?.mode === "same-category"
                          ? `${evalInfo.icon} Same-Item Bonus`
                          : "🎁 Mystery Unbox"}
                      </span>
                      <h2>10-Order Bonus Card</h2>
                    </div>
                    <div className="account-min-bonus__count">
                      <strong>{clampedStamps}</strong>
                      <small>/ 10</small>
                    </div>
                  </div>

                  <div className="account-min-progress" aria-hidden="true">
                    <div
                      style={{
                        width: `${Math.min(100, (clampedStamps / 10) * 100)}%`,
                      }}
                    />
                  </div>

                  {/* Compact 5x2 Stamp Strip */}
                  <div className="account-min-slots" role="list">
                    {Array.from({ length: 10 }, (_, idx) => {
                      const slotNumber = idx + 1;
                      const isTenth = slotNumber === 10;
                      const isStamped = clampedStamps >= slotNumber;
                      const isNextInKitchen =
                        !isStamped &&
                        slotNumber === clampedStamps + 1 &&
                        card.activeOrderCount > 0;
                      const realCat = evalInfo?.slotCategories[idx];
                      const catInfo = realCat ? CATEGORY_ICON_MAP[realCat] : null;
                      return (
                        <div
                          key={slotNumber}
                          role="listitem"
                          className={`account-min-slot${
                            isStamped ? " is-stamped" : ""
                          }${isTenth ? " is-tenth" : ""}${
                            isNextInKitchen ? " is-kitchen" : ""
                          }`}
                        >
                          <small>#{slotNumber}</small>
                          <span>
                            {isStamped
                              ? (catInfo?.icon ?? "★")
                              : isNextInKitchen
                                ? "👨‍🍳"
                                : isTenth
                                  ? (evalInfo?.icon ?? "🎁")
                                  : "○"}
                          </span>
                          <b>
                            {isStamped
                              ? (catInfo?.short ?? "Done")
                              : isNextInKitchen
                                ? "Cooking"
                                : isTenth
                                  ? "Free!"
                                  : "Open"}
                          </b>
                        </div>
                      );
                    })}
                  </div>

                  {/* Compact Unbox / Reward Action Strip */}
                  <div className="account-min-unbox">
                    <div className="account-min-unbox__text">
                      <strong>{evalInfo?.rewardTitle}</strong>
                      <small>
                        {clampedStamps < 10
                          ? `${10 - clampedStamps} more completed orders to unlock (10 same items = free same item; mixed = Mystery Unbox).`
                          : "🎉 All 10 completed orders reached! Claim your reward now."}
                      </small>
                    </div>

                    {mysteryOpened || claimedTenObj ? (
                      <div className="account-min-unbox__prize">
                        <span>
                          🎁{" "}
                          {claimedTenObj
                            ? claimedTenObj.reward
                            : evalInfo?.unboxedPrize}
                        </span>
                        {claimedTenObj && (
                          <button
                            type="button"
                            onClick={() => {
                              void navigator.clipboard?.writeText(
                                claimedTenObj.code,
                              );
                              setCopiedCode(claimedTenObj.code);
                              window.setTimeout(() => setCopiedCode(""), 2000);
                            }}
                          >
                            {copiedCode === claimedTenObj.code
                              ? "Copied ✓"
                              : `Code: ${claimedTenObj.code}`}
                          </button>
                        )}
                      </div>
                    ) : card.totalStamps >= 10 ? (
                      <button
                        type="button"
                        className={`account-min-unbox__btn is-ready${
                          mysteryShaking ? " is-shaking" : ""
                        }`}
                        disabled={claimingTarget !== null}
                        onClick={() => void handleClaimTenOrderReward()}
                      >
                        🎁 Unbox &amp; Claim
                      </button>
                    ) : (
                      <button
                        type="button"
                        className={`account-min-unbox__btn${
                          mysteryShaking ? " is-shaking" : ""
                        }`}
                        onClick={triggerMysteryUnbox}
                      >
                        {evalInfo?.icon ?? "🎁"} Peek Prize ✨
                      </button>
                    )}
                  </div>
                </section>

                {/* Compact Inline Delivery Address & Favourite Craving Bar */}
                <form
                  onSubmit={(e) => void handleUpdateProfile(e)}
                  className="account-min-profile-form"
                >
                  <label className="account-min-profile-form__addr">
                    <span>📍 Delivery Address (Optional)</span>
                    <input
                      type="text"
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      placeholder="e.g. Cinema Road, Jaranwala"
                      maxLength={200}
                    />
                  </label>
                  <label className="account-min-profile-form__fav">
                    <span>Craving</span>
                    <select
                      value={favoriteCategory}
                      onChange={(e) =>
                        setFavoriteCategory(e.target.value as Category)
                      }
                    >
                      <option value="Shawarma">Shawarma 🌯</option>
                      <option value="Burger">Burgers 🍔</option>
                      <option value="Chicken Broast">Broast 🍗</option>
                      <option value="Loaded Fries">Fries 🍟</option>
                      <option value="Cold Drinks">Drinks 🥤</option>
                    </select>
                  </label>
                  <button
                    type="submit"
                    className="account-min-profile-form__save"
                    disabled={loading}
                  >
                    {loading ? "…" : "Save"}
                  </button>
                </form>
              </div>

              {/* RIGHT: Compact Scrollable Order History & Live Status */}
              <section
                className="account-min-orders"
                aria-label="Order History and Live Status"
              >
                <div className="account-min-orders__head">
                  <div>
                    <span className="kicker">LIVE TRACKER &amp; HISTORY</span>
                    <h2>🛵 Your Orders ({card.recentOrders.length})</h2>
                  </div>
                  <span className="account-min-orders__hint">
                    Completed order = +1 Stamp ★
                  </span>
                </div>

                {card.recentOrders.length === 0 ? (
                  <div className="account-min-orders__empty">
                    <p>No orders yet. Place your first order to start earning stamps!</p>
                    <Link href="/#shawarma" className="account-min-btn is-primary">
                      Explore Menu ↗
                    </Link>
                  </div>
                ) : (
                  <div className="account-min-orders__list">
                    {card.recentOrders.map((ord) => {
                      const rankMap: Record<string, number> = {
                        new: 0,
                        confirmed: 1,
                        preparing: 2,
                        ready: 3,
                        "out-for-delivery": 3,
                        completed: 4,
                      };
                      const currentRank = rankMap[ord.status] ?? 0;
                      const formattedDate = new Date(
                        ord.createdAt,
                      ).toLocaleString("en-PK", {
                        month: "short",
                        day: "numeric",
                        hour: "numeric",
                        minute: "2-digit",
                      });
                      return (
                        <article
                          key={ord.number}
                          className="account-min-order-card"
                        >
                          <div className="account-min-order-card__top">
                            <div>
                              <strong>#{ord.number}</strong>
                              <b>{formatPKR(ord.total)}</b>
                              <small>
                                {formattedDate} ·{" "}
                                {ord.fulfillment === "delivery"
                                  ? "Delivery"
                                  : "Pickup"}
                              </small>
                            </div>
                            <span className={`order-status-pill is-${ord.status}`}>
                              {statusLabels[ord.status]}
                            </span>
                          </div>

                          <p className="account-min-order-card__items">
                            {ord.itemsSummary}
                          </p>

                          <div className="account-min-steps">
                            {[
                              "Placed",
                              "Confirmed",
                              "Preparing",
                              ord.fulfillment === "delivery"
                                ? "On Way"
                                : "Ready",
                              "Done ★",
                            ].map((label, idx) => {
                              const isDone = currentRank >= idx;
                              return (
                                <span
                                  key={label}
                                  className={isDone ? "is-done" : ""}
                                >
                                  <i>{isDone ? "✓" : idx + 1}</i>
                                  {label}
                                </span>
                              );
                            })}
                          </div>
                        </article>
                      );
                    })}
                  </div>
                )}
              </section>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}

