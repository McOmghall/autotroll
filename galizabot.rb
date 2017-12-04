require 'twitter_ebooks'
require 'json'

begin
  require_relative "oauth_data"
rescue LoadError
  module TwitterOAuthData
    # Twitter analysis galiza https://apps.twitter.com/app/8301917/permissions
    def TwitterOAuthData.options_twitter
      {   
        :consumer_key        => ENV['CONSUMER_KEY'],
        :consumer_secret     => ENV['CONSUMER_SECRET'],
        :access_token        => ENV['ACCESS_TOKEN'],
        :access_token_secret => ENV['ACCESS_TOKEN_SECRET']    
      }
    end
  end
end

class Galizabot < Ebooks::Bot
  # Configuration here applies to all MyBots
  def configure
    # Consumer details come from registering an app at https://dev.twitter.com/
    # Once you have consumer details, use "ebooks auth" for new access tokens
    self.consumer_key = TwitterOAuthData.options_twitter[:consumer_key]
    self.consumer_secret = TwitterOAuthData.options_twitter[:consumer_secret]
  end
  
  def dump_custom_search
    search_results = (self.twitter.search("galiciabilingue", :result_type => "recent").collect.to_a +
    self.twitter.search("amesanl", :result_type => "recent").collect.to_a +
    self.twitter.search("queremosgalego", :result_type => "recent").collect.to_a +
    self.twitter.search("obloque", :result_type => "recent").collect.to_a +
    self.twitter.search("from:en_marea", :result_type => "recent").collect.to_a)
    
    search_results.each do |tweet|
      puts tweet.text
    end
    
    File.open('./search_results.json', 'w') do |f|
      search_results = search_results.map(&:attrs).each { |tw|  tw.delete(:entities)  }
      f.write(JSON.pretty_generate(search_results))
    end
  end

  def generate_model_samples
    model = Ebooks::Model.load('./model/search_results.model')
    100.times do
      log model.make_statement(140)
    end
  end
  
  def on_startup
    log 'starting up'
    model = Ebooks::Model.load('./model/search_results.model')
    tweet 'Galiza acordou: ' + model.make_statement(140)
    log 'made an statement'
    scheduler.every '60m' do
      tweet 'Galiza di: ' + model.make_statement(140)
    end
  end

  def on_message(dm)
    # Reply to a DM
    # reply(dm, "secret secrets")
  end

  def on_follow(user)
    # Follow a user back
    # follow(user.screen_name)
  end

  def on_mention(tweet)
    # Reply to a mention
    # reply(tweet, meta(tweet).reply_prefix + "oh hullo")
  end

  def on_timeline(tweet)
    # Reply to a tweet in the bot's timeline
    # reply(tweet, meta(tweet).reply_prefix + "nice tweet")
  end

  def on_favorite(user, tweet)
    # Follow user who just favorited bot's tweet
    # follow(user.screen_name)
  end

  def on_retweet(tweet)
    # Follow user who just retweeted bot's tweet
    # follow(tweet.user.screen_name)
  end
end
