FROM eclipse-temurin:17-jdk AS build
WORKDIR /app
COPY backend/gradlew backend/build.gradle backend/settings.gradle ./
COPY backend/gradle ./gradle
COPY backend/src ./src
RUN sh ./gradlew --no-daemon bootJar

FROM eclipse-temurin:17-jre
WORKDIR /app
COPY --from=build /app/build/libs/ridge-lens.jar ./ridge-lens.jar
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "ridge-lens.jar"]
