# jar는 기기와 상관없으므로 빌드는 빌드 머신의 아키텍처로 한 번만 하고,
# 실행 이미지만 amd64/arm64(Oracle 무료 VM)용으로 따로 만든다.
FROM --platform=$BUILDPLATFORM eclipse-temurin:21-jdk AS build
WORKDIR /src
COPY gradlew settings.gradle.kts build.gradle.kts ./
COPY gradle gradle
RUN ./gradlew --no-daemon dependencies > /dev/null
COPY src src
RUN ./gradlew --no-daemon bootJar -x test && cp build/libs/*-SNAPSHOT.jar /app.jar

FROM eclipse-temurin:21-jre
RUN useradd --system --uid 10001 room
USER room
COPY --from=build /app.jar /app/app.jar
EXPOSE 8080
ENTRYPOINT ["java", "-XX:MaxRAMPercentage=75", "-jar", "/app/app.jar"]
