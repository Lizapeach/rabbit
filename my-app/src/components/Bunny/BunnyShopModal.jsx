import { useMemo, useState } from "react";

import coinIcon from "../../assets/icons/coin.svg";
import {
  BUNNY_ACCESSORY_SECTIONS,
  BUNNY_SHOP_BUTTON_STATES,
  DEFAULT_BUNNY_SHOP_COSTS,
  EMPTY_EQUIPPED_ITEMS,
  normalizeShopHexColor,
} from "./bunnyShopConfig";

import "../../styles/components/bunny-shop.css";

function PriceLabel({ price }) {
  const normalizedPrice = Math.max(0, Number(price) || 0);

  return (
    <span className="bunny-shop-price" aria-label={`${normalizedPrice} монет`}>
      <span>{normalizedPrice}</span>
      <img src={coinIcon} alt="" className="bunny-shop-price__icon" aria-hidden="true" />
    </span>
  );
}

function getItemStatus(item, ownedSet, equippedItems) {
  if (item?.buttonState) return item.buttonState;
  if (!ownedSet.has(item.id)) return BUNNY_SHOP_BUTTON_STATES.BUY;

  return Object.values(equippedItems || {}).includes(item.id)
    ? BUNNY_SHOP_BUTTON_STATES.EQUIPPED
    : BUNNY_SHOP_BUTTON_STATES.EQUIP;
}

function getButtonText(status) {
  if (status === BUNNY_SHOP_BUTTON_STATES.EQUIPPED) return "Надет";
  if (status === BUNNY_SHOP_BUTTON_STATES.EQUIP) return "Надеть";
  return "Купить";
}

function getButtonClassName(status) {
  return [
    "bunny-shop-item__button",
    status === BUNNY_SHOP_BUTTON_STATES.BUY
      ? "bunny-shop-item__button--buy"
      : "bunny-shop-item__button--owned",
    status === BUNNY_SHOP_BUTTON_STATES.EQUIPPED ? "bunny-shop-item__button--equipped" : "",
  ]
    .filter(Boolean)
    .join(" ");
}

function BunnyNameActionCard({
  bunnyName,
  namePrice,
  nameShopItem,
  normalizedCoins,
  pendingAction,
  setInfoMessage,
  runAction,
  onBuyName,
}) {
  const [draftName, setDraftName] = useState(bunnyName);

  const buyName = () => {
    const nextName = draftName.trim().slice(0, 24);

    if (nextName.length < 2) {
      setInfoMessage("Имя должно быть не короче 2 символов.", "warning");
      return;
    }

    if (nextName === bunnyName) {
      setInfoMessage("Сначала измени имя.", "warning");
      return;
    }

    if (normalizedCoins < namePrice) {
      setInfoMessage("Не хватает монет для изменения имени.", "warning");
      return;
    }

    runAction(
      "name",
      () => onBuyName?.(nextName, nameShopItem || { price: namePrice }),
      "Имя изменено."
    );
  };

  return (
    <section className="bunny-shop-action-card">
      <div className="bunny-shop-action-card__head">
        <div>
          <h3>Имя зайчика</h3>
        </div>
        <PriceLabel price={namePrice} />
      </div>

      <input
        className="bunny-shop-name-input"
        value={draftName}
        maxLength={24}
        onChange={(event) => setDraftName(event.target.value)}
        placeholder="Имя зайца"
        disabled={Boolean(pendingAction)}
      />

      <button
        type="button"
        className="bunny-shop-buy-button"
        onClick={buyName}
        disabled={Boolean(pendingAction)}
      >
        {pendingAction === "name" ? "Сохраняем..." : "Купить"}
      </button>
    </section>
  );
}

function BunnyBackgroundActionCard({
  backgroundColor,
  backgroundPrice,
  backgroundShopItem,
  normalizedCoins,
  pendingAction,
  setInfoMessage,
  runAction,
  onBuyBackground,
}) {
  const initialBackgroundColor = normalizeShopHexColor(backgroundColor);
  const [draftBackgroundColor, setDraftBackgroundColor] = useState(initialBackgroundColor);

  const buyBackground = () => {
    const nextColor = normalizeShopHexColor(draftBackgroundColor);
    const currentColor = normalizeShopHexColor(backgroundColor);

    if (nextColor === currentColor) {
      setInfoMessage("Сначала выбери другой фон.", "warning");
      return;
    }

    if (normalizedCoins < backgroundPrice) {
      setInfoMessage("Не хватает монет для изменения фона.", "warning");
      return;
    }

    runAction(
      "background",
      () => onBuyBackground?.(nextColor, backgroundShopItem || { price: backgroundPrice }),
      "Фон изменён."
    );
  };

  return (
    <section className="bunny-shop-action-card">
      <div className="bunny-shop-action-card__head">
        <div>
          <h3>Фон зайчика</h3>
        </div>
        <PriceLabel price={backgroundPrice} />
      </div>

      <div className="bunny-shop-color-row">
        <input
          type="color"
          value={draftBackgroundColor}
          onChange={(event) => setDraftBackgroundColor(event.target.value)}
          className="bunny-shop-color-input"
          aria-label="Выбрать цвет фона зайца"
          disabled={Boolean(pendingAction)}
        />
        <span className="bunny-shop-color-value">{draftBackgroundColor}</span>
      </div>

      <button
        type="button"
        className="bunny-shop-buy-button"
        onClick={buyBackground}
        disabled={Boolean(pendingAction)}
      >
        {pendingAction === "background" ? "Сохраняем..." : "Купить"}
      </button>
    </section>
  );
}

export default function BunnyShopModal({
  isCry = false,
  coins = 0,
  bunnyName = "Банни",
  backgroundColor = "#f7eadf",
  reusableItems = {},
  shopSections = BUNNY_ACCESSORY_SECTIONS,
  purchasedItemIds = [],
  equippedItems = EMPTY_EQUIPPED_ITEMS,
  isLoading = false,
  error = "",
  onClose,
  onRetry,
  onBuyName,
  onBuyBackground,
  onBuyItem,
  onEquipItem,
  onUnequipCategory,
}) {
  const [message, setMessage] = useState(null);
  const [pendingAction, setPendingAction] = useState("");

  const ownedSet = useMemo(() => new Set(purchasedItemIds), [purchasedItemIds]);
  const normalizedCoins = Math.max(0, Number(coins) || 0);
  const nameShopItem = reusableItems?.name || null;
  const backgroundShopItem = reusableItems?.background || null;
  const namePrice = nameShopItem?.price ?? DEFAULT_BUNNY_SHOP_COSTS.name;
  const backgroundPrice = backgroundShopItem?.price ?? DEFAULT_BUNNY_SHOP_COSTS.background;
  const normalizedSections = Array.isArray(shopSections) ? shopSections : BUNNY_ACCESSORY_SECTIONS;

  const setInfoMessage = (text, type = "info") => {
    setMessage({ text, type });
  };

  const runAction = async (actionKey, action, successMessage) => {
    setPendingAction(actionKey);
    setMessage(null);

    try {
      await action();
      if (successMessage) setInfoMessage(successMessage);
    } catch (error) {
      setInfoMessage(
        error instanceof Error && error.message ? error.message : "Не удалось выполнить действие.",
        "warning"
      );
    } finally {
      setPendingAction("");
    }
  };

  const buyOrEquipItem = (section, item) => {
    const status = getItemStatus(item, ownedSet, equippedItems);

    if (status === BUNNY_SHOP_BUTTON_STATES.EQUIPPED) {
      setInfoMessage("Этот аксессуар уже надет.");
      return;
    }

    if (status === BUNNY_SHOP_BUTTON_STATES.BUY) {
      if (normalizedCoins < item.price) {
        setInfoMessage("Не хватает монет для покупки аксессуара.", "warning");
        return;
      }

      runAction(
        `buy-${section.id}-${item.id}`,
        () => onBuyItem?.(section, item),
        "Аксессуар куплен. Теперь его можно надеть."
      );
      return;
    }

    runAction(
      `equip-${section.id}-${item.id}`,
      () => onEquipItem?.(section, item),
      "Аксессуар надет."
    );
  };

  const unequipSection = (sectionId) => {
    runAction(
      `unequip-${sectionId}`,
      () => onUnequipCategory?.(sectionId),
      "Аксессуар снят."
    );
  };

  return (
    <div className="bunny-shop-backdrop" data-note-ui="true" onClick={onClose}>
      <div className="bunny-shop-modal" onClick={(event) => event.stopPropagation()}>
        <button type="button" className="bunny-shop-modal__close" onClick={onClose} aria-label="Закрыть магазин">
          ×
        </button>

        <div className="bunny-shop-modal__topbar">
          <div className="bunny-shop-modal__heading">
            <div className="bunny-shop-modal__title-row">
              <h2 className="bunny-shop-modal__title">Магазин питомца</h2>

              <div className="bunny-shop-wallet" aria-label={`У тебя ${normalizedCoins} монет`}>
                <span>{normalizedCoins}</span>
                <img src={coinIcon} alt="" className="bunny-shop-wallet__icon" aria-hidden="true" />
              </div>
            </div>
          </div>
        </div>

        <div className="bunny-shop-scroll">
          {isLoading && <div className="bunny-shop-empty">Магазин загружается...</div>}

          {!isLoading && error && (
            <div className="bunny-shop-message bunny-shop-message--warning">
              {error}
              {onRetry && (
                <button type="button" className="bunny-shop-buy-button" onClick={onRetry}>
                  Повторить
                </button>
              )}
            </div>
          )}

          {!isLoading && !error && (
            <>
              <div className="bunny-shop-main-actions">
                <BunnyNameActionCard
                  key={`name-${bunnyName}`}
                  bunnyName={bunnyName}
                  namePrice={namePrice}
                  nameShopItem={nameShopItem}
                  normalizedCoins={normalizedCoins}
                  pendingAction={pendingAction}
                  setInfoMessage={setInfoMessage}
                  runAction={runAction}
                  onBuyName={onBuyName}
                />

                <BunnyBackgroundActionCard
                  key={`background-${normalizeShopHexColor(backgroundColor)}`}
                  backgroundColor={backgroundColor}
                  backgroundPrice={backgroundPrice}
                  backgroundShopItem={backgroundShopItem}
                  normalizedCoins={normalizedCoins}
                  pendingAction={pendingAction}
                  setInfoMessage={setInfoMessage}
                  runAction={runAction}
                  onBuyBackground={onBuyBackground}
                />
              </div>

              {message?.text && (
                <div className={`bunny-shop-message bunny-shop-message--${message.type}`}>
                  {message.text}
                </div>
              )}

              {isCry ? (
                <div className="bunny-shop-empty">
                  Я не буду ничего надевать :(
                </div>
              ) : (
                <div className="bunny-shop-sections">
                  {normalizedSections.map((section) => {
                    const hasEquippedItem = Boolean(equippedItems?.[section.id]);
                    const sectionItems = Array.isArray(section.items) ? section.items : [];

                    return (
                      <section key={section.id} className="bunny-shop-section">
                        <div className="bunny-shop-section__header">
                          <h3>{section.title}</h3>
                          <button
                            type="button"
                            className="bunny-shop-section__remove"
                            onClick={() => unequipSection(section.id)}
                            disabled={!hasEquippedItem || Boolean(pendingAction)}
                          >
                            {pendingAction === `unequip-${section.id}` ? "Снимаем..." : "Снять"}
                          </button>
                        </div>

                        {sectionItems.length === 0 ? (
                          <div className="bunny-shop-empty">В этой категории пока нет предметов.</div>
                        ) : (
                          <div className="bunny-shop-section__list">
                            {sectionItems.map((item) => {
                              const status = getItemStatus(item, ownedSet, equippedItems);
                              const isEquipped = status === BUNNY_SHOP_BUTTON_STATES.EQUIPPED;
                              const isBuying = pendingAction === `buy-${section.id}-${item.id}`;
                              const isEquipping = pendingAction === `equip-${section.id}-${item.id}`;
                              const isPending = isBuying || isEquipping;

                              return (
                                <article
                                  key={item.id}
                                  className={`bunny-shop-item ${isEquipped ? "bunny-shop-item--equipped" : ""}`}
                                >
                                  {status === BUNNY_SHOP_BUTTON_STATES.BUY && <PriceLabel price={item.price} />}

                                  {item.image && (
                                    <div className="bunny-shop-item__image-frame">
                                      <img src={item.image} alt={item.title} className="bunny-shop-item__image" />
                                    </div>
                                  )}

                                  <div className="bunny-shop-item__title">{item.title}</div>

                                  <button
                                    type="button"
                                    className={getButtonClassName(status)}
                                    onClick={() => buyOrEquipItem(section, item)}
                                    disabled={Boolean(pendingAction) || isEquipped}
                                  >
                                    {isPending ? "Сохраняем..." : getButtonText(status)}
                                  </button>
                                </article>
                              );
                            })}
                          </div>
                        )}
                      </section>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}