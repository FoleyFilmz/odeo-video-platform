import { Event } from "@shared/schema";
import { Link } from "wouter";

interface EventCardProps {
  event: Event;
}

const EventCard = ({ event }: EventCardProps) => {
  return (
    <div className="video-card glass rounded-xl overflow-hidden">
      <img 
        src={event.thumbnailUrl} 
        alt={event.name}
        className="w-full h-48 object-cover"
      />
      <div className="p-4">
        <h3 className="text-xl font-semibold text-white">{event.name}</h3>
        <p className="text-dark-300 mb-4">
          <i className="far fa-calendar mr-2"></i>
          {event.date}
        </p>
        <Link href={`/event/${event.id}`}>
          <button className="w-full bg-primary-600 hover:bg-primary-700 text-white py-2 px-4 rounded-lg transition-colors duration-200">
            Get Videos
          </button>
        </Link>
      </div>
    </div>
  );
};

export default EventCard;
