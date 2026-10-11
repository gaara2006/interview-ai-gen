const ActivityCard = ({ title, status }) => {
  const statusColor =
    status === "Completed"
      ? "text-green-400"
      : status === "Pending"
      ? "text-yellow-400"
      : "text-blue-400";

  return (
    <div className="flex justify-between items-center bg-slate-800 p-4 rounded-xl border border-slate-700 hover:border-slate-500 transition">
      <span>{title}</span>

      <span className={`font-medium ${statusColor}`}>
        {status}
      </span>
    </div>
  );
};

export default ActivityCard;