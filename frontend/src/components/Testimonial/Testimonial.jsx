import { useEffect, useRef, useState } from "react";
import { Star } from "lucide-react";
import { testimonialStyles as s } from "../../assets/dummyStyles.js";

const testimonials = [
  { id: 1, name: "Dr. Amanda Lee", role: "Dermatologist", rating: 5, text: "The appointment booking system is incredibly efficient.", image: "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&w=400&q=80", type: "doctor" },
  { id: 2, name: "Emily Williams", role: "Patient", rating: 5, text: "Scheduling appointments has never been easier.", image: "https://images.unsplash.com/photo-1607746882042-944635dfe10e?auto=format&fit=crop&w=400&q=80", type: "patient" },
  { id: 3, name: "Dr. Robert Martinez", role: "Pediatrician", rating: 4, text: "This platform has streamlined our clinic operations significantly.", image: "https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?auto=format&fit=crop&w=400&q=80", type: "doctor" },
  { id: 4, name: "David Thompson", role: "Patient", rating: 5, text: "Booking appointments online 24/7 is a game-changer.", image: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=400&q=80", type: "patient" },
];

function Card({ testimonial, direction }) {
  return (
    <div className={`${s.testimonialCard} ${direction === "left" ? s.leftCardBorder : s.rightCardBorder}`}>
      <div className={s.cardContent}>
        <img src={testimonial.image} alt={testimonial.name} className={s.avatar} />
        <div className={s.textContainer}>
          <div className={s.nameRoleContainer}>
            <div>
              <h4 className={`${s.name} ${direction === "left" ? s.leftName : s.rightName}`}>{testimonial.name}</h4>
              <p className={s.role}>{testimonial.role}</p>
            </div>
            <div className={s.starsContainer}>
              {Array.from({ length: 5 }).map((_, i) => (
                <Star key={i} className={`${s.star} ${i < testimonial.rating ? s.activeStar : s.inactiveStar}`} />
              ))}
            </div>
          </div>
          <p className={s.quote}>"{testimonial.text}"</p>
        </div>
      </div>
    </div>
  );
}

export default function Testimonial() {
  const scrollRefLeft = useRef(null);
  const scrollRefRight = useRef(null);
  const [isPaused, setIsPaused] = useState(false);
  const left = testimonials.filter((t) => t.type === "doctor");
  const right = testimonials.filter((t) => t.type === "patient");

  useEffect(() => {
    const scrollLeft = scrollRefLeft.current;
    const scrollRight = scrollRefRight.current;
    if (!scrollLeft || !scrollRight) return;
    let rafId;
    const loop = () => {
      if (!isPaused) {
        scrollLeft.scrollTop += 0.5;
        scrollRight.scrollTop -= 0.5;
        if (scrollLeft.scrollTop >= scrollLeft.scrollHeight / 2) scrollLeft.scrollTop = 0;
        if (scrollRight.scrollTop <= 0) scrollRight.scrollTop = scrollRight.scrollHeight / 2;
      }
      rafId = requestAnimationFrame(loop);
    };
    rafId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafId);
  }, [isPaused]);

  return (
    <section className={s.container} onMouseEnter={() => setIsPaused(true)} onMouseLeave={() => setIsPaused(false)}>
      <div className={s.headerContainer}>
        <h2 className={s.title}>What People Say</h2>
        <p className={s.subtitle}>Trusted by doctors and patients</p>
      </div>
      <div className={s.grid}>
        <div className={`${s.columnContainer} ${s.leftColumnBorder}`}>
          <div className={`${s.columnHeader} ${s.leftColumnHeader}`}>Medical Professionals</div>
          <div ref={scrollRefLeft} className={s.scrollContainer}>
            {[...left, ...left].map((t, i) => <Card key={`l-${i}`} testimonial={t} direction="left" />)}
          </div>
        </div>
        <div className={`${s.columnContainer} ${s.rightColumnBorder}`}>
          <div className={`${s.columnHeader} ${s.rightColumnHeader}`}>Patients</div>
          <div ref={scrollRefRight} className={s.scrollContainer}>
            {[...right, ...right].map((t, i) => <Card key={`r-${i}`} testimonial={t} direction="right" />)}
          </div>
        </div>
      </div>
      <style>{s.animationStyles}</style>
    </section>
  );
}
