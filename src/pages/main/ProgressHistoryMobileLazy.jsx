import HistoryPageMobile from './HistoryPageMobile';
import { useAllActivitiesJourneyTasks } from '../../hooks/useActivitiesJourneyTasks';

export default function ProgressHistoryMobileLazy(props) {
  const { tasks: activityTasks } = useAllActivitiesJourneyTasks();
  return <HistoryPageMobile {...props} activityTasks={activityTasks} />;
}
