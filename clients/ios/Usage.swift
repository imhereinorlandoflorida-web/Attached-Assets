import Foundation

// Example usage — typically in a ViewModel or ViewController

class ExampleViewModel {

    private let api = APIService()
    private var scoreTask: URLSessionDataTask?

    var currentScore: Double = 0
    var errorMessage: String?

    func fetchScore(for vector: [Double]) {
        scoreTask?.cancel()
        scoreTask = api.score(vector: vector) { [weak self] result in
            switch result {
            case .success(let score):
                self?.currentScore = score
            case .failure(let error):
                self?.errorMessage = error.localizedDescription
            }
        }
    }

    func submitFeedback(vector: [Double], accepted: Bool) {
        api.sendFeedback(vector: vector, accepted: accepted) { [weak self] result in
            if case .failure(let error) = result {
                self?.errorMessage = error.localizedDescription
            }
        }
    }
}
