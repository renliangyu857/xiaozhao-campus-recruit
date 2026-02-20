package com.campusrecruit.service;

import com.campusrecruit.entity.Job;
import org.springframework.data.jpa.domain.Specification;

import jakarta.persistence.criteria.Predicate;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.List;

public final class JobQuerySpec {

    public static Specification<Job> withFilters(
            String industry,
            String type,
            String location,
            String deadlineDays,
            String rolesCommaSeparated,
            Boolean onlyNewToday
    ) {
        return (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();

            if (industry != null && !industry.isBlank() && !"ALL".equalsIgnoreCase(industry.trim())) {
                predicates.add(cb.equal(root.get("industry"), industry.trim()));
            }
            if (type != null && !type.isBlank() && !"ALL".equalsIgnoreCase(type.trim())) {
                predicates.add(cb.equal(root.get("recruitType"), type.trim()));
            }
            if (location != null && !location.isBlank()) {
                predicates.add(cb.like(root.get("locations"), "%" + location.trim() + "%"));
            }
            if (deadlineDays != null && !deadlineDays.isBlank() && !"ALL".equalsIgnoreCase(deadlineDays.trim())) {
                try {
                    int days = Integer.parseInt(deadlineDays.trim());
                    LocalDate today = LocalDate.now();
                    LocalDate maxEnd = today.plusDays(days);
                    // end_date 存为 TEXT，用 ISO 日期字符串比较
                    predicates.add(cb.between(root.get("endDate"), today.toString(), maxEnd.toString()));
                } catch (NumberFormatException ignored) {}
            }
            if (rolesCommaSeparated != null && !rolesCommaSeparated.isBlank()) {
                String[] roles = rolesCommaSeparated.split("[,，]");
                List<Predicate> rolePreds = new ArrayList<>();
                for (String r : roles) {
                    String term = r.trim();
                    if (term.isEmpty()) continue;
                    rolePreds.add(cb.like(cb.lower(root.get("roles")), "%" + term.toLowerCase() + "%"));
                }
                if (!rolePreds.isEmpty()) {
                    predicates.add(cb.or(rolePreds.toArray(new Predicate[0])));
                }
            }
            if (Boolean.TRUE.equals(onlyNewToday)) {
                LocalDateTime startOfDay = LocalDate.now().atStartOfDay();
                predicates.add(cb.greaterThanOrEqualTo(root.get("createdAt"), startOfDay));
            }

            return cb.and(predicates.toArray(new Predicate[0]));
        };
    }
}
