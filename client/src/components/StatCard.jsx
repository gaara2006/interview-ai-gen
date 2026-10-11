const StatCard = ({ title, value, color }) => {
  return (
    <div className="bg-slate-800 rounded-2xl p-5 border border-slate-700 hover:border-blue-500 hover:scale-[1.02] transition duration-300">
      <p className="text-slate-400 text-sm">{title}</p>

      <h2 className={`text-3xl font-bold mt-2 ${color}`}>
        {value}
      </h2>
    </div>
  );
};

export default StatCard;