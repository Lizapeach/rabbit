import { useMemo, useState } from "react";

import coinIcon from "../../assets/icons/coin.svg";
import {
  BUNNY_ACCESSORY_SECTIONS,
  DEFAULT_BUNNY_SHOP_COSTS,
  EMPTY_EQUIPPED_ITEMS,
  normalizeShopHexColor,
} from "./bunnyShopConfig";

import "../../styles/components/bunny-shop.css";

function PriceLabel({ price }) {
  return (
    <span className="bunny-shop-price" aria-label={`${price} монет`}>
      <span>{price}</span>
      <img src={coinIcon} alt="" className="bunny-shop-price__icon" aria-hidden="true" />
    </span>
  );
}

function getItemStatus(item, ownedSet, equippedItems) {
  if (!ownedSet.has(item.id)) return "locked";

  return Object.values(equippedItems || {}).includes(item.id) ? "equipped" : "owned";
}

export default function BunnyShopModal({
  isCry = false,
  coins = 0,
  bunnyName = "Банни",
  backgroundColor = "#f7eadf",
  purchasedItemIds = [],
  equippedItems = EMPTY_EQUIPPED_ITEMS,
  onClose,
  onBuyName,
  onBuyBackground,
  onBuyItem,
  onEquipItem,
  onUnequipCategory,
}) {
  const [draftName, setDraftName] = useState(bunnyName);
  const [draftBackgroundColor, setDraftBackgroundColor] = useState(
    normalizeShopHexColor(backgroundColor)
  );
  const [message, setMessage] = useState(null);

  const ownedSet = useMemo(() => new Set(purchasedItemIds), [purchasedItemIds]);
  const normalizedCoins = Math.max(0, Number(coins) || 0);

  const setInfoMessage = (text, type = "info") => {
    setMessage({ text, type });
  };

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

    if (normalizedCoins < DEFAULT_BUNNY_SHOP_COSTS.name) {
      setInfoMessage("Не хватает монет для изменения имени.", "warning");
      return;
    }

    onBuyName?.(nextName, DEFAULT_BUNNY_SHOP_COSTS.name);
    setInfoMessage("Имя изменено.");
  };

  const buyBackground = () => {
    const nextColor = normalizeShopHexColor(draftBackgroundColor);
    const currentColor = normalizeShopHexColor(backgroundColor);

    if (nextColor === currentColor) {
      setInfoMessage("Сначала выбери другой фон.", "warning");
      return;
    }

    if (normalizedCoins < DEFAULT_BUNNY_SHOP_COSTS.background) {
      setInfoMessage("Не хватает монет для изменения фона.", "warning");
      return;
    }

    onBuyBackground?.(nextColor, DEFAULT_BUNNY_SHOP_COSTS.background);
    setInfoMessage("Фон изменён.");
  };

  const buyOrEquipItem = (section, item) => {
    const status = getItemStatus(item, ownedSet, equippedItems);

    if (status === "locked") {
      if (normalizedCoins < item.price) {
        setInfoMessage("Не хватает монет для покупки аксессуара.", "warning");
        return;
      }

      onBuyItem?.(section, item);
      setInfoMessage("Аксессуар куплен. Теперь его можно надеть.");
      return;
    }

    onEquipItem?.(section, item);
    setInfoMessage("Аксессуар надет.");
  };

  const unequipSection = (sectionId) => {
    onUnequipCategory?.(sectionId);
    setInfoMessage("Аксессуар снят.");
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
          <div className="bunny-shop-main-actions">
            <section className="bunny-shop-action-card">
              <div className="bunny-shop-action-card__head">
                <div>
                  <h3>Имя зайчика</h3>
                </div>
                <PriceLabel price={DEFAULT_BUNNY_SHOP_COSTS.name} />
              </div>

              <input
                className="bunny-shop-name-input"
                value={draftName}
                maxLength={24}
                onChange={(event) => setDraftName(event.target.value)}
                placeholder="Имя зайца"
              />

              <button type="button" className="bunny-shop-buy-button" onClick={buyName}>
                Купить
              </button>
            </section>

            <section className="bunny-shop-action-card">
              <div className="bunny-shop-action-card__head">
                <div>
                  <h3>Фон зайчика</h3>
                </div>
                <PriceLabel price={DEFAULT_BUNNY_SHOP_COSTS.background} />
              </div>

              <div className="bunny-shop-color-row">
                <input
                  type="color"
                  value={draftBackgroundColor}
                  onChange={(event) => setDraftBackgroundColor(event.target.value)}
                  className="bunny-shop-color-input"
                  aria-label="Выбрать цвет фона зайца"
                />
                <span className="bunny-shop-color-value">{draftBackgroundColor}</span>
              </div>

              <button type="button" className="bunny-shop-buy-button" onClick={buyBackground}>
                Купить
              </button>
            </section>
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
              {BUNNY_ACCESSORY_SECTIONS.map((section) => {
                const hasEquippedItem = Boolean(equippedItems?.[section.id]);

                return (
                  <section key={section.id} className="bunny-shop-section">
                    <div className="bunny-shop-section__header">
                      <h3>{section.title}</h3>
                      <button
                        type="button"
                        className="bunny-shop-section__remove"
                        onClick={() => unequipSection(section.id)}
                        disabled={!hasEquippedItem}
                      >
                        Снять
                      </button>
                    </div>

                    <div className="bunny-shop-section__list">
                      {section.items.map((item) => {
                        const status = getItemStatus(item, ownedSet, equippedItems);
                        const isEquipped = status === "equipped";
                        const isOwned = status === "owned" || status === "equipped";

                        return (
                          <article
                            key={item.id}
                            className={`bunny-shop-item ${isEquipped ? "bunny-shop-item--equipped" : ""}`}
                          >
                            {!isOwned && <PriceLabel price={item.price} />}

                            <div className="bunny-shop-item__image-frame">
                              <img src={item.image} alt={item.title} className="bunny-shop-item__image" />
                            </div>

                            <div className="bunny-shop-item__title">{item.title}</div>

                            <button
                              type="button"
                              className={[
                                "bunny-shop-item__button",
                                !isOwned ? "bunny-shop-item__button--buy" : "bunny-shop-item__button--owned",
                                isEquipped ? "bunny-shop-item__button--equipped" : "",
                              ]
                                .filter(Boolean)
                                .join(" ")}
                              onClick={() => buyOrEquipItem(section, item)}
                            >
                              {isEquipped ? "Надето" : isOwned ? "Надеть" : "Купить"}
                            </button>
                          </article>
                        );
                      })}
                    </div>
                  </section>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
