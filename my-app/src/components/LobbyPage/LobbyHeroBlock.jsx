import AnimatedContent from "../Animation/AnimatedContent";
import BorderGlow from "../Animation/BorderGlow";

export default function LobbyHeroBlock({ userName }) {
  return (
    <AnimatedContent distance={80} duration={0.8} delay={0}>
      <section className="hero-card">
        <BorderGlow>
          <div className="hero-card__inner">
            <h1 className="hero-card__title">
              Рады вас видеть,
              <span>{userName}</span>
            </h1>

            <div className="hero-card__divider" />

            <p className="hero-card__text">
              Даже одно маленькое выполненное действие движет вперёд.
            </p>
          </div>
        </BorderGlow>
      </section>
    </AnimatedContent>
  );
}
