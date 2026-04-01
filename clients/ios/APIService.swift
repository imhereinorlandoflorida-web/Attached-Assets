import Foundation

class APIService {

    let baseURL = URL(string: "https://your-app.replit.app/api")!

    // MARK: - Score

    @discardableResult
    func score(
        vector: [Double],
        completion: @escaping (Result<Double, Error>) -> Void
    ) -> URLSessionDataTask? {
        let url = baseURL.appendingPathComponent("score")
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.addValue("application/json", forHTTPHeaderField: "Content-Type")

        do {
            request.httpBody = try JSONEncoder().encode(ScoreRequest(vector: vector))
        } catch {
            completion(.failure(error))
            return nil
        }

        let task = URLSession.shared.dataTask(with: request) { data, response, error in
            if let error = error {
                DispatchQueue.main.async { completion(.failure(error)) }
                return
            }
            guard
                let http = response as? HTTPURLResponse,
                (200..<300).contains(http.statusCode),
                let data = data
            else {
                DispatchQueue.main.async { completion(.failure(URLError(.badServerResponse))) }
                return
            }
            do {
                let result = try JSONDecoder().decode(ScoreResponse.self, from: data)
                DispatchQueue.main.async { completion(.success(result.score)) }
            } catch {
                DispatchQueue.main.async { completion(.failure(error)) }
            }
        }
        task.resume()
        return task
    }

    // MARK: - Feedback

    @discardableResult
    func sendFeedback(
        vector: [Double],
        accepted: Bool,
        completion: ((Result<Void, Error>) -> Void)? = nil
    ) -> URLSessionDataTask? {
        let url = baseURL.appendingPathComponent("feedback")
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.addValue("application/json", forHTTPHeaderField: "Content-Type")

        do {
            request.httpBody = try JSONEncoder().encode(FeedbackRequest(vector: vector, accepted: accepted))
        } catch {
            completion?(.failure(error))
            return nil
        }

        let task = URLSession.shared.dataTask(with: request) { _, response, error in
            if let error = error {
                DispatchQueue.main.async { completion?(.failure(error)) }
                return
            }
            guard
                let http = response as? HTTPURLResponse,
                (200..<300).contains(http.statusCode)
            else {
                DispatchQueue.main.async { completion?(.failure(URLError(.badServerResponse))) }
                return
            }
            DispatchQueue.main.async { completion?(.success(())) }
        }
        task.resume()
        return task
    }
}

// MARK: - Models

private struct ScoreRequest: Encodable {
    let vector: [Double]
}

private struct ScoreResponse: Decodable {
    let score: Double
}

private struct FeedbackRequest: Encodable {
    let vector: [Double]
    let accepted: Bool
}
