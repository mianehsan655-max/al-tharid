"use client";

import { useEffect, useState, type FormEvent } from "react";
import {
  claimLoyaltyMilestone,
  loginCustomerWithPassword,
  lookupOrJoinLoyalty,
  requestCustomerSignupOtp,
  updateCustomerProfileAddress,
  verifyCustomerSignupOtp,
  type LoyaltyCardState,
} from "./actions";
import { formatPKR, statusLabels } from "@/lib/orderTypes";
import type { Category, LoyaltyMilestone } from "@/lib/store";

const STORAGE_KEY = "al-tharid-loyalty-phone";
const SESSION_KEY = "al-tharid-customer-session";

type SimulatorPreset =
  | {
      id: "shawarma-10";
      label: "🌯 10× Shawarma";
      stamps: number;
      mode: "same-category";
      category: Category;
      icon: string;
      rewardTitle: string;
      unboxedPrize: string;
      slots: { icon: string; name: string }[];
    }
  | {
      id: "burger-10";
      label: "🍔 10× Burgers";
      stamps: number;
      mode: "same-category";
      category: Category;
      icon: string;
      rewardTitle: string;
      unboxedPrize: string;
      slots: { icon: string; name: string }[];
    }
  | {
      id: "broast-10";
      label: "🍗 10× Broast";
      stamps: number;
      mode: "same-category";
      category: Category;
      icon: string;
      rewardTitle: string;
      unboxedPrize: string;
      slots: { icon: string; name: string }[];
    }
  | {
      id: "fries-10";
      label: "🍟 10× Fries";
      stamps: number;
      mode: "same-category";
      category: Category;
      icon: string;
      rewardTitle: string;
      unboxedPrize: string;
      slots: { icon: string; name: string }[];
    }
  | {
      id: "mixed-10";
      label: "🎁 10× Mixed (Mystery Unbox)";
      stamps: number;
      mode: "mystery-box";
      category: null;
      icon: string;
      rewardTitle: string;
      unboxedPrize: string;
      slots: { icon: string; name: string }[];
    };

const SIMULATOR_PRESETS: SimulatorPreset[] = [
  {
    id: "shawarma-10",
    label: "🌯 10× Shawarma",
    stamps: 10,
    mode: "same-category",
    category: "Shawarma",
    icon: "🌯",
    rewardTitle: "1 Free Classic Shawarma + Surprise! 🌯",
    unboxedPrize: "1 Free Classic Arabic Garlic Shawarma + Surprise Dip 🌯✨",
    slots: Array.from({ length: 10 }, () => ({ icon: "🌯", name: "Shawarma" })),
  },
  {
    id: "burger-10",
    label: "🍔 10× Burgers",
    stamps: 10,
    mode: "same-category",
    category: "Burger",
    icon: "🍔",
    rewardTitle: "1 Free Crispy Zinger Burger + Surprise! 🍔",
    unboxedPrize: "1 Free Crispy Chicken Zinger Burger + Surprise Dip 🍔✨",
    slots: Array.from({ length: 10 }, () => ({ icon: "🍔", name: "Burger" })),
  },
  {
    id: "broast-10",
    label: "🍗 10× Broast",
    stamps: 10,
    mode: "same-category",
    category: "Chicken Broast",
    icon: "🍗",
    rewardTitle: "1 Free Quarter Chicken Broast + Surprise! 🍗",
    unboxedPrize: "1 Free Quarter Crispy Chicken Broast + Garlic Mayo 🍗✨",
    slots: Array.from({ length: 10 }, () => ({ icon: "🍗", name: "Broast" })),
  },
  {
    id: "fries-10",
    label: "🍟 10× Fries",
    stamps: 10,
    mode: "same-category",
    category: "Loaded Fries",
    icon: "🍟",
    rewardTitle: "1 Free Cheesy Loaded Fries + Surprise! 🍟",
    unboxedPrize: "1 Free Classic Cheesy Loaded Fries + Surprise Sauce 🍟✨",
    slots: Array.from({ length: 10 }, () => ({ icon: "🍟", name: "Fries" })),
  },
  {
    id: "mixed-10",
    label: "🎁 10× Mixed (Mystery Unbox)",
    stamps: 10,
    mode: "mystery-box",
    category: null,
    icon: "🎁",
    rewardTitle: "🎁 Mystery Unbox at Order #10!",
    unboxedPrize:
      "🎁 Mystery Box Unboxed: 1 Free Classic Shawarma + Chef’s Surprise Dip! 🌯✨",
    slots: [
      { icon: "🌯", name: "Shawarma" },
      { icon: "🍔", name: "Burger" },
      { icon: "🍟", name: "Fries" },
      { icon: "🍗", name: "Broast" },
      { icon: "🌯", name: "Shawarma" },
      { icon: "🥤", name: "Drink" },
      { icon: "🍔", name: "Burger" },
      { icon: "🌯", name: "Shawarma" },
      { icon: "🍟", name: "Fries" },
      { icon: "🎁", name: "Mystery Box!" },
    ],
  },
];

const CATEGORY_ICON_MAP: Record<Category, { icon: string; short: string }> = {
  Shawarma: { icon: "🌯", short: "Shawarma" },
  Burger: { icon: "🍔", short: "Burger" },
  "Chicken Broast": { icon: "🍗", short: "Broast" },
  "Loaded Fries": { icon: "🍟", short: "Fries" },
  "Cold Drinks": { icon: "🥤", short: "Drink" },
  Deals: { icon: "🍱", short: "Combo" },
};

export default function LoyaltySection({
  initialMilestones,
}: {
  initialMilestones: LoyaltyMilestone[];
}) {
  const [authTab, setAuthTab] = useState<"signup" | "login">("signup");
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
  const [activePreset, setActivePreset] = useState<SimulatorPreset | null>(null);
  const [mysteryOpened, setMysteryOpened] = useState(false);
  const [mysteryShaking, setMysteryShaking] = useState(false);
  const [loading, setLoading] = useState(false);
  const [claimingTarget, setClaimingTarget] = useState<number | null>(null);
  const [refreshingOrders, setRefreshingOrders] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [copiedCode, setCopiedCode] = useState("");

  void initialMilestones;

  useEffect(() => {
    const loadSaved = () => {
      try {
        const savedPhone = localStorage.getItem(STORAGE_KEY);
        if (savedPhone) {
          setPhone(savedPhone);
          void lookupOrJoinLoyalty({ phone: savedPhone }).then((res) => {
            if (res.ok) {
              setCard(res.card);
              setAddress(res.card.member.address ?? "");
              setFavoriteCategory(res.card.member.favoriteCategory);
            }
          });
        }
      } catch {
        /* Ignore storage errors */
      }
    };
    loadSaved();
    window.addEventListener("al-tharid-auth-change", loadSaved);
    return () => window.removeEventListener("al-tharid-auth-change", loadSaved);
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

  async function handleRefreshLiveOrders() {
    if (!card || refreshingOrders) return;
    setRefreshingOrders(true);
    try {
      const res = await lookupOrJoinLoyalty({ phone: card.member.phone });
      if (res.ok) {
        setCard(res.card);
        setNotice("✓ Live order tracking & bonus stamps refreshed!");
      }
    } finally {
      setRefreshingOrders(false);
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
        } (${result.targetDisplay}). Enter it below to verify!`,
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
    setActivePreset(null);
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
        `🎉 OTP Verified! Welcome ${result.card.member.name} (@${
          result.card.member.username ?? result.card.member.name
        })! Track your live orders and collect 10 completed order stamps for free food!`,
      );
    } catch {
      setError("Could not verify OTP. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (loading) return;
    setLoading(true);
    setError("");
    setNotice("");
    setActivePreset(null);
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
      setNotice(
        `Welcome back, ${result.card.member.name}! Your live orders and 10-Order Bonus Card are loaded.`,
      );
    } catch {
      setError("Could not log in right now. Please try again.");
    } finally {
      setLoading(false);
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
      setNotice("✓ Your profile and optional delivery address have been saved!");
    } catch {
      setError("Could not update profile.");
    } finally {
      setLoading(false);
    }
  }

  function handleLogout() {
    setCard(null);
    setPendingOtp(null);
    setPassword("");
    setLoginPassword("");
    setNotice("You have logged out. Log in anytime with your username and password!");
    setError("");
    try {
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem(SESSION_KEY);
      window.dispatchEvent(new Event("al-tharid-auth-change"));
    } catch {
      /* Ignore */
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
        `🎉 Congratulations! Your 10-Order Reward is unlocked! Use voucher code ${result.claimedCode} in your checkout notes.`,
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
    }, 650);
  }

  const activeStamps = activePreset
    ? activePreset.stamps
    : (card?.totalStamps ?? 0);
  const clampedStamps = Math.min(10, Math.max(0, activeStamps));
  const evalMode = activePreset
    ? activePreset.mode
    : (card?.rewardEvaluation.mode ?? "mystery-box");
  const evalRewardTitle = activePreset
    ? activePreset.rewardTitle
    : (card?.rewardEvaluation.rewardTitle ??
      "1 Free Classic Shawarma or Same-Item / Mystery Unbox!");
  const evalUnboxedPrize = activePreset
    ? activePreset.unboxedPrize
    : (card?.rewardEvaluation.unboxedPrize ??
      "1 Free Classic Arabic Garlic Shawarma + Surprise Dip 🌯✨");
  const evalIcon = activePreset
    ? activePreset.icon
    : (card?.rewardEvaluation.icon ?? "🎁");

  const claimedTenObj = card?.member.rewardCodes.find((r) => r.target === 10);

  return (
    <section
      id="loyalty"
      className="loyalty-section"
      aria-labelledby="loyalty-heading"
    >
      <div className="wrap">
        <div className="loyalty-section__header">
          <div>
            <span className="kicker">
              AL-THARID 10-ORDER BONUS CARD &amp; LIVE ORDER TRACKER
            </span>
            <h2 id="loyalty-heading">
              Complete 10 Orders.{" "}
              <em>Get Free Food or Mystery Unbox.</em>
            </h2>
          </div>
          <p className="loyalty-section__intro">
            Every completed order stamps your bonus card! Complete{" "}
            <strong>10 orders of the same item</strong> (10 Shawarmas, 10 Burgers,
            10 Broasts, or 10 Fries) to get{" "}
            <strong>that exact item FREE + a surprise</strong> — or complete{" "}
            <strong>10 mixed orders</strong> to unlock our{" "}
            <strong>🎁 Mystery Unbox</strong> (Free Shawarma or Chef Surprise)!
          </p>
        </div>

        <div className="loyalty-layout">
          {/* LEFT COLUMN: 10-Order Bonus Card + Mystery Unbox + Live Order Tracker */}
          <div className="loyalty-card-shell">
            <div className="loyalty-stamp-card">
              <div className="loyalty-stamp-card__top">
                <div>
                  <span className="loyalty-stamp-card__badge">
                    {evalMode === "same-category"
                      ? `${evalIcon} 10-Order Same-Item Bonus`
                      : "🎁 10-Order Mystery Unbox Mode"}
                  </span>
                  <h3>{card ? `${card.member.name}’s Bonus Card` : "YOUR 10-ORDER BONUS CARD"}</h3>
                  <small>
                    {card
                      ? `Total Orders: ${card.orderCount} · Completed Stamps: ${card.completedOrderCount} · In Kitchen: ${card.activeOrderCount}`
                      : "Place an order or log in to track your live orders & collect completed stamps!"}
                  </small>
                </div>
                <div className="loyalty-stamp-card__counter">
                  <strong>{clampedStamps}</strong>
                  <span>/ 10 COMPLETED</span>
                </div>
              </div>

              {/* Progress bar to 10th Order */}
              <div className="loyalty-progress">
                <div className="loyalty-progress__labels">
                  <span>
                    {clampedStamps < 10
                      ? `${10 - clampedStamps} more completed ${
                          10 - clampedStamps === 1 ? "order" : "orders"
                        } to unlock: ${evalRewardTitle}`
                      : `🎉 10/10 Orders Complete! Ready to claim: ${evalRewardTitle}`}
                  </span>
                  <b>{Math.round((clampedStamps / 10) * 100)}%</b>
                </div>
                <div className="loyalty-progress__bar" aria-hidden="true">
                  <div
                    className="loyalty-progress__fill"
                    style={{
                      width: `${Math.min(100, (clampedStamps / 10) * 100)}%`,
                    }}
                  />
                </div>
              </div>

              {/* 10 Stamp Slots Grid */}
              <div
                className="loyalty-slots"
                role="list"
                aria-label="10 completed order stamp slots"
              >
                {Array.from({ length: 10 }, (_, idx) => {
                  const slotNumber = idx + 1;
                  const isTenth = slotNumber === 10;
                  const isStamped = clampedStamps >= slotNumber;
                  const isNextInKitchen =
                    !activePreset &&
                    !isStamped &&
                    slotNumber === clampedStamps + 1 &&
                    (card?.activeOrderCount ?? 0) > 0;

                  const presetSlot = activePreset?.slots[idx];
                  const realCategory =
                    card?.rewardEvaluation.slotCategories[idx];
                  const catInfo = realCategory
                    ? CATEGORY_ICON_MAP[realCategory]
                    : null;

                  const slotIcon = presetSlot
                    ? presetSlot.icon
                    : isStamped
                      ? (catInfo?.icon ?? "★")
                      : isTenth
                        ? evalMode === "mystery-box"
                          ? "🎁"
                          : evalIcon
                        : isNextInKitchen
                          ? "👨‍🍳"
                          : "○";

                  const slotLabel = presetSlot
                    ? presetSlot.name
                    : isStamped
                      ? `${catInfo?.short ?? "Order"} ✓`
                      : isNextInKitchen
                        ? "In Kitchen…"
                        : isTenth
                          ? evalMode === "mystery-box"
                            ? "Mystery Unbox!"
                            : "FREE REWARD!"
                          : `Order #${slotNumber}`;

                  return (
                    <div
                      key={slotNumber}
                      role="listitem"
                      className={`loyalty-slot${isStamped ? " is-stamped" : ""}${
                        isTenth ? " is-milestone" : ""
                      }${isNextInKitchen ? " is-in-kitchen" : ""}`}
                    >
                      <span className="loyalty-slot__num">#{slotNumber}</span>
                      <div className="loyalty-slot__icon" aria-hidden="true">
                        {slotIcon}
                      </div>
                      <small className="loyalty-slot__label">{slotLabel}</small>
                    </div>
                  );
                })}
              </div>

              {/* Interactive Mystery Unbox / 10-Order Reward Box */}
              <div className="mystery-unbox-stage">
                <div className="mystery-unbox-stage__info">
                  <span className="mystery-unbox-stage__tag">
                    {evalMode === "same-category"
                      ? "🎯 10 SAME-ITEM REWARD RULE"
                      : "🎁 10 MIXED-ORDERS MYSTERY UNBOX"}
                  </span>
                  <h4>{evalRewardTitle}</h4>
                  <p>
                    {evalMode === "same-category"
                      ? "Complete 10 orders of this same category and your 10th reward is the exact same item FREE + a surprise treat!"
                      : "Ordered a mix of Shawarma, Burgers, Broast & Fries? Complete 10 orders to unbox your Mystery Reward at the end!"}
                  </p>
                </div>

                <div className="mystery-unbox-stage__action">
                  {mysteryOpened || claimedTenObj ? (
                    <div className="mystery-unbox-revealed">
                      <span>🎉 UNBOXED PRIZE:</span>
                      <strong>
                        {claimedTenObj ? claimedTenObj.reward : evalUnboxedPrize}
                      </strong>
                      {claimedTenObj && (
                        <div className="loyalty-code-pill">
                          <span>
                            Code: <b>{claimedTenObj.code}</b>
                          </span>
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
                              : "Copy"}
                          </button>
                        </div>
                      )}
                    </div>
                  ) : card && card.totalStamps >= 10 ? (
                    <button
                      type="button"
                      className={`mystery-unbox-btn${
                        mysteryShaking ? " is-shaking" : ""
                      }`}
                      disabled={claimingTarget !== null}
                      onClick={() => void handleClaimTenOrderReward()}
                    >
                      <span>🎁</span>
                      <strong>
                        {claimingTarget === 10
                          ? "Unboxing Your Prize…"
                          : "Unbox & Claim 10-Order Prize!"}
                      </strong>
                    </button>
                  ) : (
                    <button
                      type="button"
                      className={`mystery-unbox-btn${
                        mysteryShaking ? " is-shaking" : ""
                      }`}
                      onClick={triggerMysteryUnbox}
                    >
                      <span>{evalMode === "mystery-box" ? "🎁" : evalIcon}</span>
                      <strong>
                        {activePreset
                          ? "Tap to Unbox Preview Prize! ✨"
                          : `Tap to Peek Inside (${Math.max(0, 10 - clampedStamps)} orders left)`}
                      </strong>
                    </button>
                  )}
                </div>
              </div>

              {/* Interactive Simulator so visitors can test Same-Item vs Mystery Unbox */}
              <div className="loyalty-simulator">
                <span>
                  Preview how our 10-Order Reward &amp; Mystery Unbox works:
                </span>
                <div className="loyalty-simulator__buttons">
                  {SIMULATOR_PRESETS.map((preset) => (
                    <button
                      key={preset.id}
                      type="button"
                      className={activePreset?.id === preset.id ? "is-active" : ""}
                      onClick={() => {
                        setActivePreset(preset);
                        setMysteryOpened(false);
                      }}
                    >
                      {preset.label}
                    </button>
                  ))}
                  {activePreset !== null && (
                    <button
                      type="button"
                      className="loyalty-simulator__reset"
                      onClick={() => {
                        setActivePreset(null);
                        setMysteryOpened(false);
                      }}
                    >
                      Show My Real Stamps
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* LIVE ORDER TRACKING SECTION (Shown when customer has orders or is logged in) */}
            {card && (
              <div className="customer-live-orders">
                <div className="customer-live-orders__header">
                  <div>
                    <span className="kicker">LIVE KITCHEN TRACKER</span>
                    <h4>
                      🛵 Your Recent &amp; Active Orders ({card.orderCount} Total)
                    </h4>
                  </div>
                  <button
                    type="button"
                    className="customer-live-orders__refresh"
                    onClick={() => void handleRefreshLiveOrders()}
                    disabled={refreshingOrders}
                  >
                    {refreshingOrders ? "Updating…" : "↻ Refresh Live Status"}
                  </button>
                </div>

                {card.recentOrders.length === 0 ? (
                  <p className="customer-live-orders__empty">
                    You haven’t placed an order yet. Order your favourite Shawarma,
                    Burger, or Crispy Broast and track it live right here!
                  </p>
                ) : (
                  <div className="customer-live-orders__list">
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
                      return (
                        <div key={ord.number} className="tracked-order-card">
                          <div className="tracked-order-card__top">
                            <div>
                              <strong>Order #{ord.number}</strong>
                              <small>
                                {ord.itemsSummary} · {formatPKR(ord.total)}
                              </small>
                            </div>
                            <span className={`order-status-pill is-${ord.status}`}>
                              {statusLabels[ord.status]}
                            </span>
                          </div>
                          <div className="post-order-steps">
                            {[
                              { key: "new", label: "Placed" },
                              { key: "confirmed", label: "Confirmed" },
                              { key: "preparing", label: "Preparing" },
                              {
                                key:
                                  ord.fulfillment === "delivery"
                                    ? "out-for-delivery"
                                    : "ready",
                                label:
                                  ord.fulfillment === "delivery"
                                    ? "Out for Delivery"
                                    : "Ready",
                              },
                              { key: "completed", label: "Completed (+1 ★)" },
                            ].map((stepItem, idx) => {
                              const isDone = currentRank >= idx;
                              return (
                                <div
                                  key={stepItem.key}
                                  className={`post-order-step${
                                    isDone ? " is-done" : ""
                                  }`}
                                >
                                  <span>{isDone ? "✓" : idx + 1}</span>
                                  <small>{stepItem.label}</small>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* RIGHT COLUMN: Customer Sign Up (OTP) & Login (Username + Password) Panel */}
          <div className="loyalty-signup-panel">
            <span className="loyalty-signup-panel__tag">
              {card
                ? "✓ LOGGED IN · LIVE ORDER & BONUS ACCOUNT"
                : "SIMPLE OTP SIGN UP · USERNAME & PASSWORD LOGIN"}
            </span>

            {!card && (
              <div className="customer-auth-tabs" role="tablist">
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
              </div>
            )}

            <h3>
              {card
                ? `Welcome, ${card.member.name}!`
                : authTab === "signup"
                  ? pendingOtp
                    ? "Enter 6-Digit OTP to Verify"
                    : "Simple Sign Up"
                  : "Login to Track Orders"}
            </h3>

            <p>
              {card
                ? "Here are your total orders, live order status, and 10-Order Bonus Card progress."
                : authTab === "signup"
                  ? "Sign up with your Name & Mobile Number (or Email) — or simply place an order and we’ll create your account automatically!"
                  : "Log in with your Username / Name, Mobile Number, or Email and your password to track your order and bonus stamps."}
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

            {card ? (
              <div className="customer-profile-box">
                <div className="loyalty-stats-mini">
                  <div>
                    <small>TOTAL ORDERS</small>
                    <strong>{card.orderCount}</strong>
                  </div>
                  <div>
                    <small>IN KITCHEN</small>
                    <strong>{card.activeOrderCount}</strong>
                  </div>
                  <div>
                    <small>COMPLETED STAMPS</small>
                    <strong>{card.totalStamps} / 10</strong>
                  </div>
                </div>

                <div className="customer-profile-meta">
                  <div>
                    <small>USERNAME / NAME</small>
                    <strong>
                      {card.member.name}{" "}
                      {card.member.username ? `(@${card.member.username})` : ""}
                    </strong>
                  </div>
                  <div>
                    <small>VERIFIED CONTACT</small>
                    <strong>
                      +{card.member.phone}
                      {card.member.email ? ` · ${card.member.email}` : ""}
                    </strong>
                  </div>
                </div>

                <form
                  onSubmit={(e) => void handleUpdateProfile(e)}
                  className="loyalty-form"
                >
                  <label>
                    Delivery Address in Jaranwala{" "}
                    <span className="field-optional">(Optional)</span>
                    <input
                      type="text"
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      placeholder="e.g. Cinema Chowk, Street 3, Jaranwala"
                      maxLength={200}
                    />
                  </label>

                  <label>
                    Your #1 Craving at Al-Tharid
                    <select
                      value={favoriteCategory}
                      onChange={(e) =>
                        setFavoriteCategory(e.target.value as Category)
                      }
                    >
                      <option value="Shawarma">Arabic Shawarma 🌯</option>
                      <option value="Burger">Crispy Zinger Burgers 🍔</option>
                      <option value="Chicken Broast">Chicken Broast 🍗</option>
                      <option value="Loaded Fries">Loaded Cheesy Fries 🍟</option>
                      <option value="Cold Drinks">
                        Mint Lemonade &amp; Drinks 🥤
                      </option>
                    </select>
                  </label>

                  <div className="customer-profile-actions">
                    <button
                      type="submit"
                      className="primary-button loyalty-form__submit"
                      disabled={loading}
                    >
                      <span>{loading ? "Saving…" : "Save Profile Details"}</span>
                    </button>
                    <button
                      type="button"
                      className="customer-logout-btn"
                      onClick={handleLogout}
                    >
                      Logout
                    </button>
                  </div>
                </form>
              </div>
            ) : authTab === "signup" ? (
              !pendingOtp ? (
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
                        ? "Sending 6-Digit OTP…"
                        : `Send OTP to ${otpChannel === "email" ? "Email" : "Mobile"}`}
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
                        : "Verify OTP & Activate Account"}
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
                    ← Edit Name / Mobile / Email
                  </button>
                </form>
              )
            ) : (
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
                  <span>{loading ? "Logging in…" : "Login & Track My Orders"}</span>
                  <span aria-hidden="true">↗</span>
                </button>
              </form>
            )}

            <div className="loyalty-how-it-works">
              <strong>How our 10-Order Bonus Card works:</strong>
              <ol>
                <li>
                  <b>10 Same-Category Orders</b>: Complete 10 Shawarma orders → Free
                  Shawarma! Complete 10 Burger orders → Free Burger! Same for Broast
                  &amp; Fries!
                </li>
                <li>
                  <b>10 Mixed Orders</b>: Order different items across your 10 orders
                  to unlock the <b>🎁 Mystery Unbox</b> at Order #10!
                </li>
              </ol>
              <div style={{ marginTop: "14px" }}>
                <a href="/account" className="outline-button" style={{ display: "inline-flex", width: "100%", justifyContent: "center" }}>
                  Open Dedicated Account &amp; Order History Page ↗
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
