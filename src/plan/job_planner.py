import os
import random
from collections import Counter
from typing import Callable, Dict, List, Optional, Sequence, Tuple

from src.constant import CONSTANT
from src.floor import Coordinate, SectorMapSnapshot
from src.job import InstructionType, Job, JobInstruction
from src.operators import HT_Coordinate_View
from src.plan.job_tracker import JobTracker


class JobPlanner:
    _CORRIDOR_SPLIT_X = 21
    _YARD_DI_CAPACITY = 700
    _YARD_CAPACITY_HARD_PENALTY = 1_000_000
    _YARD_CAPACITY_SOFT_THRESHOLD = 15
    _YARD_CAPACITY_SOFT_PENALTY = 750
    """
    Coordinates job planning activities using HT tracker and sector map data.

    Attributes
    ----------
    ht_coord_tracker : HT_Coordinate_View
        An instance responsible for tracking the coordinates of HTs.
    sector_map_snapshot : SectorMapSnapshot
        A snapshot of the sector map representing the current state of the environment for planning.
    """

    def __init__(
        self,
        ht_coord_tracker: HT_Coordinate_View,
        sector_map_snapshot: SectorMapSnapshot,
        feature_overrides: Optional[Dict[str, bool]] = None,
    ):
        self.ht_coord_tracker = ht_coord_tracker
        self.sector_map_snapshot = sector_map_snapshot
        self._rng = random.Random(0)
        self._latest_yard_plan: Dict[str, str] = dict()
        self._recent_yard_usage: Counter = Counter()
        self._features: Dict[str, bool] = {
            "dynamic_corridor_bias": False,
            "ga_diversity": False,
            "ht_future_penalty": False,
            "path_cache": False,
        }
        env_flags = os.getenv("JOB_PLANNER_FEATURES", "")
        if env_flags:
            for token in env_flags.split(","):
                flag = token.strip()
                if not flag:
                    continue
                if flag.startswith("!"):
                    name = flag[1:]
                    if name in self._features:
                        self._features[name] = False
                elif flag in self._features:
                    self._features[flag] = True
        if feature_overrides:
            self._features.update(feature_overrides)
        self._corridor_history: Counter = Counter()
        self._path_cache: Dict[Tuple, Tuple[Tuple[int, int], ...]] = dict()
        self._yard_di_allocation: Counter = Counter()

    def is_deadlock(self):
        return self.ht_coord_tracker.is_deadlock()

    def get_non_moving_HT(self):
        return self.ht_coord_tracker.get_non_moving_HT()

    """ YOUR TASK HERE
    Objective: modify the following functions (including input arguments as you see fit) to achieve better planning efficiency.
        select_HT():
            select HT for the job based on your self-defined logic.
        select_yard():
            select yard for the job based on your self-defined logic.
        get_path_from_buffer_to_QC():
        get_path_from_buffer_to_yard():
        get_path_from_yard_to_buffer():
        get_path_from_QC_to_buffer():
            generate an efficient path for HT to navigate between listed locations (QC, yard, buffer).        
    """

    def plan(self, job_tracker: JobTracker) -> List[Job]:
        # logger.info("Planning started.")
        if self._features["dynamic_corridor_bias"]:
            self._apply_corridor_history_decay()
        plannable_job_seqs = job_tracker.get_plannable_job_sequences()
        self._latest_yard_plan = self._optimize_yard_assignments(
            job_tracker, plannable_job_seqs
        )
        selected_HT_names = list()  # avoid selecting duplicated HT during the process
        new_jobs = list()  # container for newly created jobs
        used_yard_assignments: List[str] = []

        # create job loop: ranging from 0 to at most 16 jobs
        for job_seq in plannable_job_seqs:
            # parse job info
            job = job_tracker.get_job(job_seq)
            job_info = job.get_job_info()
            job_type, QC_name, yard_name, alt_yard_names = [
                job_info[k]
                for k in ["job_type", "QC_name", "yard_name", "alt_yard_names"]
            ]

            assigned_yard = yard_name

            if job_type == CONSTANT.JOB_PARAMETER.DISCHARGE_JOB_TYPE:
                planned_yard = self.select_yard(job_seq, job_info)
                if planned_yard:
                    assigned_yard = planned_yard

            # select HT for the job based on job type, return None if no HT available or applicable
            HT_name = self.select_HT(job_info, selected_HT_names, assigned_yard)

            # not proceed with job planning if no available HTs
            if HT_name is None:
                break
            selected_HT_names.append(HT_name)

            # record the assigned HT and yard
            job.assign_job(HT_name=HT_name, yard_name=assigned_yard)

            if assigned_yard:
                used_yard_assignments.append(assigned_yard)

            # construct the job instructions
            job_instructions = list()
            buffer_coord = self.ht_coord_tracker.get_coordinate(HT_name)

            # For DI job
            if job_type == CONSTANT.JOB_PARAMETER.DISCHARGE_JOB_TYPE:

                # 1. Book QC resource
                job_instructions.append(
                    JobInstruction(
                        instruction_type=InstructionType.BOOK_QC,
                    )
                )

                # 2. HT drives from Buffer to QC[IN]
                buffer_coord = self.ht_coord_tracker.get_coordinate(HT_name)
                path = self.get_path_from_buffer_to_QC(buffer_coord, QC_name)
                job_instructions.append(
                    JobInstruction(
                        instruction_type=InstructionType.DRIVE,
                        HT_name=HT_name,
                        path=path,
                    )
                )

                # 3. Work with QC
                job_instructions.append(
                    JobInstruction(
                        instruction_type=InstructionType.WORK_QC,
                        HT_name=HT_name,
                        QC_name=QC_name,
                    )
                )

                # 4. HT drives from QC to Buffer
                path = self.get_path_from_QC_to_buffer(QC_name, buffer_coord)
                job_instructions.append(
                    JobInstruction(
                        instruction_type=InstructionType.DRIVE,
                        HT_name=HT_name,
                        path=path,
                    )
                )

                # 5. Book Yard resource
                job_instructions.append(
                    JobInstruction(
                        instruction_type=InstructionType.BOOK_YARD,
                    )
                )

                # 6. HT drives from Buffer to Yard[IN]
                path = self.get_path_from_buffer_to_yard(buffer_coord, assigned_yard)
                job_instructions.append(
                    JobInstruction(
                        instruction_type=InstructionType.DRIVE,
                        HT_name=HT_name,
                        path=path,
                    )
                )

                # 7. Work with Yard
                job_instructions.append(
                    JobInstruction(
                        instruction_type=InstructionType.WORK_YARD,
                        HT_name=HT_name,
                        yard_name=assigned_yard,
                    )
                )

                # 8. HT drives from Yard to Buffer
                path = self.get_path_from_yard_to_buffer(assigned_yard, buffer_coord)
                job_instructions.append(
                    JobInstruction(
                        instruction_type=InstructionType.DRIVE,
                        HT_name=HT_name,
                        path=path,
                    )
                )

            # For LO job
            else:

                # 1. Book Yard resource
                job_instructions.append(
                    JobInstruction(
                        instruction_type=InstructionType.BOOK_YARD,
                    )
                )

                # 2. HT drives from buffer to Yard[IN]
                buffer_coord = self.ht_coord_tracker.get_coordinate(HT_name)
                path = self.get_path_from_buffer_to_yard(buffer_coord, assigned_yard)
                job_instructions.append(
                    JobInstruction(
                        instruction_type=InstructionType.DRIVE,
                        HT_name=HT_name,
                        path=path,
                    )
                )

                # 3. Work with Yard
                job_instructions.append(
                    JobInstruction(
                        instruction_type=InstructionType.WORK_YARD,
                        HT_name=HT_name,
                        yard_name=assigned_yard,
                    )
                )

                # 4. HT drives from Yard to buffer
                path = self.get_path_from_yard_to_buffer(assigned_yard, buffer_coord)
                job_instructions.append(
                    JobInstruction(
                        instruction_type=InstructionType.DRIVE,
                        HT_name=HT_name,
                        path=path,
                    )
                )

                # 5. Book QC resource
                job_instructions.append(
                    JobInstruction(
                        instruction_type=InstructionType.BOOK_QC,
                    )
                )

                # 6. HT drives from buffer to QC[IN]
                path = self.get_path_from_buffer_to_QC(buffer_coord, QC_name)
                job_instructions.append(
                    JobInstruction(
                        instruction_type=InstructionType.DRIVE,
                        HT_name=HT_name,
                        path=path,
                    )
                )

                # 7. Work with QC
                job_instructions.append(
                    JobInstruction(
                        instruction_type=InstructionType.WORK_QC,
                        HT_name=HT_name,
                        QC_name=QC_name,
                    )
                )

                # 8. HT drives from QC to buffer
                path = self.get_path_from_QC_to_buffer(QC_name, buffer_coord)
                job_instructions.append(
                    JobInstruction(
                        instruction_type=InstructionType.DRIVE,
                        HT_name=HT_name,
                        path=path,
                    )
                )

            job.set_instructions(job_instructions)
            new_jobs.append(job)
            if (
                job_type == CONSTANT.JOB_PARAMETER.DISCHARGE_JOB_TYPE
                and assigned_yard
            ):
                self._yard_di_allocation[assigned_yard] += 1
            # logger.debug(f"{job}")

        if used_yard_assignments:
            self._apply_yard_usage_decay()
            self._recent_yard_usage.update(used_yard_assignments)
            if self._features["dynamic_corridor_bias"]:
                for yard_name in used_yard_assignments:
                    side = self._yard_side(yard_name)
                    self._corridor_history[side] += 1

        return new_jobs

    # HT ASSIGNMENT LOGIC
    def select_HT(
        self,
        job_info: Dict[str, object],
        selected_HT_names: List[str],
        assigned_yard: str,
    ) -> Optional[str]:
        """Select an available HT using a distance-based heuristic.

        The heuristic estimates the travel effort for each idle HT, favouring the
        unit that minimises the combined distance of the immediate trip and the
        following leg implied by the job type and yard assignment.

        Args:
            job_info: Metadata describing the job currently being planned.
            selected_HT_names: HTs already chosen in this planning pass.
            assigned_yard: Yard selected for the job, if any.

        Returns:
            The chosen HT name, or ``None`` if no idle HT is available.
        """
        plannable_HTs = self.ht_coord_tracker.get_available_HTs()
        best_choice = None
        best_cost = float("inf")

        for HT_name in plannable_HTs:
            if HT_name in selected_HT_names:
                continue

            ht_coord = self.ht_coord_tracker.get_coordinate(HT_name)
            if ht_coord is None:
                continue

            cost = self._estimate_HT_assignment_cost(ht_coord, job_info, assigned_yard)
            if cost < best_cost:
                best_cost = cost
                best_choice = HT_name

        return best_choice

    def _estimate_HT_assignment_cost(
        self, ht_coord: Coordinate, job_info: Dict[str, object], assigned_yard: str
    ) -> float:
        job_type = job_info.get("job_type")
        qc_sector = self.sector_map_snapshot.get_QC_sector(job_info.get("QC_name"))
        if qc_sector is None:
            return float("inf")

        yard_sector = (
            self.sector_map_snapshot.get_yard_sector(assigned_yard)
            if assigned_yard
            else None
        )

        cost = 0.0

        if job_type == CONSTANT.JOB_PARAMETER.DISCHARGE_JOB_TYPE:
            cost += self._manhattan_distance(ht_coord, qc_sector.in_coord)
            if yard_sector:
                onward = self._manhattan_distance(
                    qc_sector.out_coord, yard_sector.in_coord
                )
                cost += onward * 0.7
                cost += abs(ht_coord.x - yard_sector.in_coord.x) * 0.1
        else:
            if yard_sector:
                cost += self._manhattan_distance(ht_coord, yard_sector.in_coord)
                onward = self._manhattan_distance(
                    yard_sector.out_coord, qc_sector.in_coord
                )
                cost += onward * 0.7
                cost += abs(ht_coord.x - yard_sector.in_coord.x) * 0.05
            else:
                cost += self._manhattan_distance(ht_coord, qc_sector.in_coord)

        if assigned_yard:
            cost += self._recent_yard_usage.get(assigned_yard, 0) * 0.3
            if self._features["ht_future_penalty"]:
                yard_side = self._yard_side(assigned_yard)
                corridor_diff = self._corridor_history["west"] - self._corridor_history["east"]
                if yard_side == "west" and corridor_diff > 0:
                    cost += corridor_diff * 0.5
                elif yard_side == "east" and corridor_diff < 0:
                    cost += abs(corridor_diff) * 0.5
                ht_side = self._corridor_side_from_coordinate(ht_coord)
                if ht_side and yard_side and ht_side != yard_side:
                    cost += 4.0

        return cost

    # YARD ASSIGNMENT LOGIC
    def select_yard(self, job_seq: str, job_info: Dict[str, object]) -> str:
        """Select the yard for a discharge job based on precomputed planning data."""
        yard_plan = getattr(self, "_latest_yard_plan", {})
        if job_seq in yard_plan:
            return yard_plan[job_seq]

        options = self._enumerate_yard_options(job_info)
        if not options:
            return job_info.get("yard_name")

        return self._select_best_yard(job_info, options)

    def _select_best_yard(self, job_info: Dict[str, object], options: Sequence[str]) -> str:
        best_choice = None
        best_score = float("inf")
        for option in options:
            score = self._yard_choice_cost(job_info, option)
            if score < best_score:
                best_score = score
                best_choice = option
        return best_choice if best_choice is not None else options[0]

    def _optimize_yard_assignments(
        self, job_tracker: JobTracker, job_seqs: List[str]
    ) -> Dict[str, str]:
        yard_plan: Dict[str, str] = dict()
        candidate_jobs: List[tuple] = list()
        base_di_counts = Counter(self._yard_di_allocation)

        for job_seq in job_seqs:
            job = job_tracker.get_job(job_seq)
            if job is None:
                continue
            job_info = job.get_job_info()
            if job_info["job_type"] != CONSTANT.JOB_PARAMETER.DISCHARGE_JOB_TYPE:
                continue
            options = self._enumerate_yard_options(job_info)
            if not options:
                continue
            if len(options) == 1:
                yard_plan[job_seq] = options[0]
                base_di_counts[options[0]] += 1
                continue
            candidate_jobs.append((job_seq, job_info, options))

        if not candidate_jobs:
            return yard_plan

        population_size = min(16, max(4, len(candidate_jobs) * 2))
        generations = 5
        elite_count = max(1, min(3, population_size // 3))

        if self._features["ga_diversity"]:
            base_plan = {
                job_seq: self._diverse_seed_choice(job_info, options)
                for job_seq, job_info, options in candidate_jobs
            }
        else:
            base_plan = {job_seq: options[0] for job_seq, _, options in candidate_jobs}
        population = [base_plan]
        while len(population) < population_size:
            population.append(self._random_assignment(candidate_jobs, base_di_counts))

        best_plan = base_plan
        best_score = float("inf")
        mutation_rate = 0.35 if not self._features["ga_diversity"] else 0.4
        stagnant_generations = 0

        for _ in range(generations):
            scored_population = sorted(
                (
                    (
                        self._score_yard_plan(
                            plan,
                            candidate_jobs,
                            base_di_counts,
                        ),
                        plan,
                    )
                    for plan in population
                ),
                key=lambda item: item[0],
            )

            if scored_population and scored_population[0][0] < best_score:
                best_score, best_plan = scored_population[0]
                stagnant_generations = 0
            else:
                stagnant_generations += 1
                if self._features["ga_diversity"] and stagnant_generations >= 1:
                    mutation_rate = min(0.65, mutation_rate + 0.1)

            elites = [plan for _, plan in scored_population[:elite_count]]
            if not elites:
                elites = [best_plan]

            new_population = elites.copy()
            while len(new_population) < population_size:
                parent = self._rng.choice(elites)
                child = self._mutate_assignment(
                    parent, candidate_jobs, mutation_rate, base_di_counts
                )
                new_population.append(child)
            population = new_population

        final_scored = sorted(
            (
                (
                    self._score_yard_plan(
                        plan,
                        candidate_jobs,
                        base_di_counts,
                    ),
                    plan,
                )
                for plan in population
            ),
            key=lambda item: item[0],
        )
        if final_scored and final_scored[0][0] < best_score:
            best_score, best_plan = final_scored[0]

        best_plan = self._enforce_capacity_limit(best_plan, candidate_jobs, base_di_counts)
        yard_plan.update(best_plan)
        return yard_plan

    def _random_assignment(
        self, candidate_jobs: List[tuple], base_counts: Counter
    ) -> Dict[str, str]:
        assignment: Dict[str, str] = dict()
        local_counts = Counter(base_counts)
        for job_seq, job_info, options in candidate_jobs:
            preferred = job_info.get("yard_name")
            if self._features["ga_diversity"]:
                weighted_options = sorted(
                    options,
                    key=lambda option: self._yard_choice_cost(job_info, option)
                    + self._rng.random() * 5.0,
                )
                choice = self._pick_feasible_yard(weighted_options, local_counts)
                assignment[job_seq] = choice
            elif preferred in options and self._rng.random() < 0.6:
                choice = self._pick_feasible_yard((preferred,) + tuple(options), local_counts)
                assignment[job_seq] = choice
            else:
                shuffled = list(options)
                self._rng.shuffle(shuffled)
                choice = self._pick_feasible_yard(tuple(shuffled), local_counts)
                assignment[job_seq] = choice
            local_counts[assignment[job_seq]] += 1
        return assignment

    def _mutate_assignment(
        self,
        baseline: Dict[str, str],
        candidate_jobs: List[tuple],
        mutation_rate: float = 0.35,
        base_counts: Optional[Counter] = None,
    ) -> Dict[str, str]:
        mutated = baseline.copy()
        current_counts = Counter(base_counts or Counter())
        for yard in mutated.values():
            current_counts[yard] += 1
        for job_seq, _, options in candidate_jobs:
            if len(options) <= 1:
                continue
            if self._rng.random() < mutation_rate:
                current = mutated.get(job_seq, options[0])
                alternative_pool = [opt for opt in options if opt != current]
                if not alternative_pool:
                    alternative_pool = list(options)
                self._rng.shuffle(alternative_pool)
                for candidate in alternative_pool:
                    if (
                        current_counts[candidate]
                        < self._YARD_DI_CAPACITY
                    ):
                        mutated[job_seq] = candidate
                        current_counts[current] -= 1
                        current_counts[candidate] += 1
                        break
        return mutated

    def _enumerate_yard_options(self, job_info: Dict[str, object]) -> Sequence[str]:
        options: List[str] = []
        primary = job_info.get("yard_name")
        if primary:
            options.append(primary)
        for candidate in job_info.get("alt_yard_names", []) or []:
            if candidate and candidate not in options:
                options.append(candidate)
        return tuple(options)

    def _score_yard_plan(
        self,
        plan: Dict[str, str],
        candidate_jobs: List[tuple],
        base_counts: Counter,
    ) -> float:
        job_lookup = {job_seq: job_info for job_seq, job_info, _ in candidate_jobs}
        yard_counts = Counter()
        corridor_counts = Counter()
        for yard_name, count in base_counts.items():
            corridor_counts[self._yard_side(yard_name)] += count
        total_cost = 0.0

        for job_seq, yard_name in plan.items():
            job_info = job_lookup[job_seq]
            total_cost += self._yard_choice_cost(job_info, yard_name)
            yard_counts[yard_name] += 1
            corridor_counts[self._yard_side(yard_name)] += 1

        for yard_name, count in yard_counts.items():
            if count > 1:
                total_cost += (count - 1) * 10 + count * count
            recent = self._recent_yard_usage.get(yard_name, 0)
            if recent:
                total_cost += min(recent, 6) * 1.5
            combined = count + base_counts.get(yard_name, 0)
            if combined > self._YARD_DI_CAPACITY:
                overflow = combined - self._YARD_DI_CAPACITY
                total_cost += overflow * self._YARD_CAPACITY_HARD_PENALTY
            else:
                remaining = self._YARD_DI_CAPACITY - combined
                if remaining <= self._YARD_CAPACITY_SOFT_THRESHOLD:
                    total_cost += (
                        self._YARD_CAPACITY_SOFT_THRESHOLD - remaining + 1
                    ) * self._YARD_CAPACITY_SOFT_PENALTY

        imbalance = abs(corridor_counts["west"] - corridor_counts["east"])
        if self._features["dynamic_corridor_bias"]:
            history_diff = abs(
                self._corridor_history["west"] - self._corridor_history["east"]
            )
            total_cost += imbalance * (2.0 + 0.5 * history_diff)
        else:
            total_cost += imbalance * 2.0

        return total_cost

    def _enforce_capacity_limit(
        self,
        plan: Dict[str, str],
        candidate_jobs: List[tuple],
        base_counts: Counter,
    ) -> Dict[str, str]:
        if not plan:
            return plan

        combined_counts = Counter(base_counts)
        job_lookup = {job_seq: (job_info, options) for job_seq, job_info, options in candidate_jobs}
        for job_seq, yard_name in plan.items():
            combined_counts[yard_name] += 1

        def capacity_overflow() -> Dict[str, int]:
            return {
                yard: count - self._YARD_DI_CAPACITY
                for yard, count in combined_counts.items()
                if count > self._YARD_DI_CAPACITY
            }

        overflow = capacity_overflow()
        if not overflow:
            return plan

        while overflow:
            yard, excess = max(overflow.items(), key=lambda item: item[1])
            if excess <= 0:
                break
            movable_jobs: List[Tuple[float, str, str]] = []
            for job_seq, (job_info, options) in job_lookup.items():
                if plan.get(job_seq) != yard:
                    continue
                alternatives = [opt for opt in options if opt != yard]
                for alt in alternatives:
                    if combined_counts[alt] >= self._YARD_DI_CAPACITY:
                        continue
                    current_cost = self._yard_choice_cost(job_info, yard)
                    alt_cost = self._yard_choice_cost(job_info, alt)
                    delta = alt_cost - current_cost
                    movable_jobs.append((delta, job_seq, alt))

            if not movable_jobs:
                break

            movable_jobs.sort(key=lambda item: (item[0], job_lookup[item[1]][0]["QC_name"]))
            _, job_seq, target_yard = movable_jobs[0]
            plan[job_seq] = target_yard
            combined_counts[yard] -= 1
            combined_counts[target_yard] += 1
            overflow = capacity_overflow()

        return plan

    def _pick_feasible_yard(
        self, options: Sequence[str], current_counts: Counter
    ) -> str:
        for option in options:
            if current_counts[option] < self._YARD_DI_CAPACITY:
                return option
        return options[0]

    def _yard_choice_cost(self, job_info: Dict[str, object], yard_name: str) -> float:
        qc_sector = self.sector_map_snapshot.get_QC_sector(job_info["QC_name"])
        yard_sector = self.sector_map_snapshot.get_yard_sector(yard_name)
        if not qc_sector or not yard_sector:
            return float("inf")

        distance = self._manhattan_distance(qc_sector.out_coord, yard_sector.in_coord)
        cost = distance * CONSTANT.JOB_PARAMETER.HT_DRIVE_TIME_PER_SECTOR

        preferred = job_info.get("yard_name")
        if yard_name != preferred:
            alt_names = job_info.get("alt_yard_names", []) or []
            try:
                rank = alt_names.index(yard_name)
            except ValueError:
                rank = len(alt_names)
            cost += (rank + 1) * 8
        else:
            cost *= 0.92

        if self._features["dynamic_corridor_bias"]:
            cost += self._corridor_pressure_penalty(yard_name)

        return cost

    def _yard_side(self, yard_name: str) -> str:
        if yard_name and yard_name[0] in {"A", "B", "C", "D"}:
            return "west"
        return "east"

    def _manhattan_distance(self, start: Coordinate, end: Coordinate) -> int:
        return abs(start.x - end.x) + abs(start.y - end.y)

    def _apply_yard_usage_decay(self):
        if not self._recent_yard_usage:
            return
        for yard_name in list(self._recent_yard_usage.keys()):
            decayed = self._recent_yard_usage[yard_name] - 1
            if decayed > 0:
                self._recent_yard_usage[yard_name] = decayed
            else:
                del self._recent_yard_usage[yard_name]

    # NAVIGATION LOGIC
    def get_path_from_buffer_to_QC(
        self, buffer_coord: Coordinate, QC_name: str
    ) -> List[Coordinate]:
        """
        Generates a path from a buffer location to a Quay Crane (QC) input coordinate.

        The path follows a predefined route:
        1. Moves south to the highway left lane (y = 7).
        2. Travels west along the highway to the left boundary (x = 1).
        3. Moves north to the upper lane (y = 4).
        4. Travels east to the IN coordinate of the specified QC.

        Args:
            buffer_coord (Coordinate): The starting coordinate in the buffer zone.
            QC_name (str): The name of the Quay Crane to which the path should lead.

        Returns:
            List[Coordinate]: A list of coordinates representing the path from the buffer to the QC.
        """
        def build() -> List[Coordinate]:
            QC_in_coord = self.sector_map_snapshot.get_QC_sector(QC_name).in_coord
            highway_lane_y = 7
            path_local = [Coordinate(buffer_coord.x, highway_lane_y)]
            path_local.extend(
                [Coordinate(x, highway_lane_y) for x in range(buffer_coord.x - 1, 0, -1)]
            )
            up_path_x = 1
            path_local.extend([Coordinate(up_path_x, y) for y in range(6, 3, -1)])
            qc_travel_lane_y = 4
            path_local.extend(
                [
                    Coordinate(x, qc_travel_lane_y)
                    for x in range(2, QC_in_coord.x + 1, 1)
                ]
            )
            path_local.append(QC_in_coord)
            return path_local

        cache_key = ("buffer_to_qc", buffer_coord.x, buffer_coord.y, QC_name)
        return self._build_path_with_cache(cache_key, build)

    def get_path_from_buffer_to_yard(
        self, buffer_coord: Coordinate, yard_name: str
    ) -> List[Coordinate]:
        """
        Generates a path from a buffer location to a yard IN area's coordinate.

        The path follows a specific route:
        1. Moves north to the QC travel lane (y = 5).
        2. Travels east to the right boundary of the sector (x = 42).
        3. Moves south to the Highway Left lane (y = 11).
        4. Travels west along the highway to the left boundary (x = 1).
        5. Moves south to the lower boundary (y = 12).
        6. Travels east to the IN coordinate of the specified yard.

        Args:
            buffer_coord (Coordinate): The starting coordinate in the buffer zone.
            yard_name (str): The name of the yard to which the path should lead.

        Returns:
            List[Coordinate]: A list of coordinates representing the path from the buffer to the yard.
        """
        def build() -> List[Coordinate]:
            yard_in_coord = self.sector_map_snapshot.get_yard_sector(yard_name).in_coord
            path_local = [Coordinate(buffer_coord.x, buffer_coord.y - 1)]
            qc_lane_y = 5
            path_local.extend(
                [Coordinate(x, qc_lane_y) for x in range(buffer_coord.x + 1, 43, 1)]
            )
            down_path_x = 42
            path_local.extend([Coordinate(down_path_x, y) for y in range(6, 12, 1)])
            highway_lane_y = 11
            path_local.extend([Coordinate(x, highway_lane_y) for x in range(41, 0, -1)])
            highway_lane_y = 12
            path_local.append(Coordinate(1, highway_lane_y))
            path_local.extend(
                [
                    Coordinate(x, highway_lane_y)
                    for x in range(2, yard_in_coord.x + 1, 1)
                ]
            )
            path_local.append(yard_in_coord)
            return path_local

        cache_key = ("buffer_to_yard", buffer_coord.x, buffer_coord.y, yard_name)
        return self._build_path_with_cache(cache_key, build)

    def get_path_from_yard_to_buffer(
        self, yard_name: str, buffer_coord: Coordinate
    ) -> List[Coordinate]:
        """
        Generates a path from a yard OUT area's coordinate to a buffer location.

        The path follows this route:
        1. Starts at the yard OUT coordinate.
        2. Moves east along the highway lane (y = 12) towards the second-to-right boundary.
        3. Moves north to the Highway Left lane (y = 7).
        4. Travels west along the highway left lane to the target buffer coordinate.

        Args:
            yard_name (str): The name of the yard from which the path starts.
            buffer_coord (Coordinate): The destination coordinate in the buffer zone.

        Returns:
            List[Coordinate]: A list of coordinates representing the path from the yard to the buffer.
        """
        def build() -> List[Coordinate]:
            yard_out_coord = self.sector_map_snapshot.get_yard_sector(yard_name).out_coord
            path_local = [yard_out_coord]
            highway_lane_y = 12
            path_local.extend(
                [Coordinate(x, highway_lane_y) for x in range(yard_out_coord.x, 42, 1)]
            )
            up_path_x = 41
            path_local.extend([Coordinate(up_path_x, y) for y in range(11, 6, -1)])
            highway_lane_y = 7
            path_local.extend(
                [Coordinate(x, highway_lane_y) for x in range(40, buffer_coord.x - 1, -1)]
            )
            path_local.append(buffer_coord)
            return path_local

        cache_key = ("yard_to_buffer", yard_name, buffer_coord.x, buffer_coord.y)
        return self._build_path_with_cache(cache_key, build)

    def get_path_from_QC_to_buffer(
        self, QC_name: str, buffer_coord: Coordinate
    ) -> List[Coordinate]:
        """
        Generates a path from a Quay Crane (QC) OUT coordinate to a buffer location.

        The path follows this route:
        1. Starts at the QC OUT coordinate.
        2. Moves south to the QC travel lane (y = 4).
        3. Travels east along the QC travel lane to the right boundary.
        4. Moves south to the Highway Left lane (y = 7).
        5. Travels west along the highway left lane to the buffer coordinate.

        Args:
            QC_name (str): The name of the Quay Crane from which the path starts.
            buffer_coord (Coordinate): The destination coordinate in the buffer zone.

        Returns:
            List[Coordinate]: A list of coordinates representing the path from the QC to the buffer.
        """
        def build() -> List[Coordinate]:
            QC_out_coord = self.sector_map_snapshot.get_QC_sector(QC_name).out_coord
            path_local = [QC_out_coord]
            qc_travel_lane_y = 4
            path_local.append(Coordinate(QC_out_coord.x, qc_travel_lane_y))
            path_local.extend(
                [Coordinate(x, qc_travel_lane_y) for x in range(QC_out_coord.x + 1, 43, 1)]
            )
            down_path_x = 42
            path_local.extend([Coordinate(down_path_x, y) for y in range(5, 8, 1)])
            highway_lane_y = 7
            path_local.extend(
                [Coordinate(x, highway_lane_y) for x in range(41, buffer_coord.x - 1, -1)]
            )
            path_local.append(buffer_coord)
            return path_local

        cache_key = ("qc_to_buffer", QC_name, buffer_coord.x, buffer_coord.y)
        return self._build_path_with_cache(cache_key, build)

    def _build_path_with_cache(
        self,
        cache_key: Tuple,
        builder: Callable[[], List[Coordinate]],
    ) -> List[Coordinate]:
        if not self._features["path_cache"]:
            return builder()
        cached = self._path_cache.get(cache_key)
        if cached is None:
            path = builder()
            self._path_cache[cache_key] = tuple((coord.x, coord.y) for coord in path)
            return path
        return [Coordinate(x, y) for x, y in cached]

    def _corridor_pressure_penalty(self, yard_name: str) -> float:
        side = self._yard_side(yard_name)
        opposite = "east" if side == "west" else "west"
        imbalance = self._corridor_history[side] - self._corridor_history[opposite]
        return max(0, imbalance) * 1.2

    def _apply_corridor_history_decay(self) -> None:
        if not self._corridor_history:
            return
        for side in ("west", "east"):
            current = self._corridor_history.get(side, 0)
            if current <= 0:
                continue
            self._corridor_history[side] = max(0, current - 1)

    def _corridor_side_from_coordinate(self, coord: Coordinate) -> Optional[str]:
        if coord is None:
            return None
        return "west" if coord.x <= self._CORRIDOR_SPLIT_X else "east"

    def _diverse_seed_choice(
        self, job_info: Dict[str, object], options: Sequence[str]
    ) -> str:
        ranked = sorted(
            options,
            key=lambda option: self._yard_choice_cost(job_info, option)
            + self._rng.random() * 2.0,
        )
        return ranked[0]
